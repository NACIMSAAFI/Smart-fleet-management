const db = require('../config/db');

// Helper function for date formatting
const formatDate = (dateInput) => {
    const date = new Date(dateInput);
    // Return local date string (YYYY-MM-DD)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Consolidated conflict checking
const checkForConflicts = async (vehicleId, startDate, endDate, excludeId = null) => {
    const [conflicts] = await db.promise().query(`
        SELECT 
            start_date, 
            end_date, 
            is_maintenance
        FROM rental_durations
        WHERE vehicle_id = ?
        AND id != ?
        AND (
            (start_date <= ? AND end_date >= ?) OR
            (start_date <= ? AND end_date >= ?) OR
            (start_date >= ? AND end_date <= ?)
        )
        LIMIT 1
    `, [
        vehicleId, 
        excludeId || 0,
        startDate, startDate,
        endDate, endDate,
        startDate, endDate
    ]);

    return conflicts.length > 0 ? conflicts[0] : null;
};

exports.setRentalDuration = async (req, res) => {
    const { 
        vehicle_id: vehicleId, 
        start_date: startDate, 
        end_date: endDate, 
        is_maintenance: isMaintenance = false,
        is_reservation: isReservation = false  // Default to false if not provided
    } = req.body;

    // Debug log the incoming data
    console.log("Incoming duration data:", {
        vehicleId, 
        startDate, 
        endDate, 
        isMaintenance, 
        isReservation
    });


    if (!vehicleId || !startDate || !endDate) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        await db.promise().query('START TRANSACTION');
        
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        if (end < start) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        // Check vehicle exists
        const [vehicle] = await db.promise().query(
            'SELECT id FROM vehicles WHERE id = ?', 
            [vehicleId]
        );
        if (!vehicle.length) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        // Check for conflicts
        const conflict = await checkForConflicts(vehicleId, startDate, endDate);
        if (conflict) {
            await db.promise().query('ROLLBACK');
            return res.status(409).json({ 
                message: 'Vehicle already booked for these dates',
                conflict: {
                    startDate: formatDate(conflict.start_date),
                    endDate: formatDate(conflict.end_date),
                    type: conflict.is_maintenance ? 'maintenance' : 'rental/reservation'
                }
            });
        }

        // Insert/update duration
        await db.promise().query(`
            INSERT INTO rental_durations (vehicle_id, start_date, end_date, is_maintenance, is_reservation)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                end_date = VALUES(end_date),
                is_maintenance = VALUES(is_maintenance),
                is_reservation = VALUES(is_reservation)
        `, [vehicleId, startDate, endDate, isMaintenance ? 1 : 0, isReservation ? 1 : 0]);

        await db.promise().query('COMMIT');
        
        res.status(201).json({ 
            success: true,
            message: isMaintenance ? 'Maintenance period set' : 'Rental period set'
        });

    } catch (err) {
        await db.promise().query('ROLLBACK');
        console.error('Error setting duration:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error',
            error: err.message 
        });
    }
};

exports.getRentalDurations = async (req, res) => {
    const { vehicle_id: vehicleId, start_date: startDate, end_date: endDate } = req.query;
    
    try {
        let query = `
            SELECT 
                d.id,
                d.vehicle_id, 
                DATE(d.start_date) as start_date, 
                DATE(d.end_date) as end_date,
                d.is_maintenance,
                d.is_reservation,
                v.brand,
                v.model,
                v.plate_number
            FROM rental_durations d
            JOIN vehicles v ON v.id = d.vehicle_id
        `;
        
        const params = [];
        
        // Apply filters if provided
        if (vehicleId || startDate || endDate) {
            query += ' WHERE ';
            const conditions = [];
            
            if (vehicleId) {
                conditions.push('d.vehicle_id = ?');
                params.push(vehicleId);
            }
            
            if (startDate && endDate) {
                conditions.push('(d.start_date <= ? AND d.end_date >= ?)');
                params.push(endDate, startDate);
            } else if (startDate) {
                conditions.push('d.end_date >= ?');
                params.push(startDate);
            } else if (endDate) {
                conditions.push('d.start_date <= ?');
                params.push(endDate);
            }
            
            query += conditions.join(' AND ');
        }
        
        query += ' ORDER BY d.start_date';
        
        const [durations] = await db.promise().query(query, params);
        
        res.status(200).json({
            success: true,
            data: durations
        });
    } catch (err) {
        console.error('Error fetching durations:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to load durations' 
        });
    }
};

exports.deleteRentalDuration = async (req, res) => {
    const { vehicleId, startDate } = req.params;

    try {
        // No need to reformat the date since we're sending it correctly formatted
        const [result] = await db.promise().query(`
            DELETE FROM rental_durations
            WHERE vehicle_id = ? AND start_date = ?
        `, [vehicleId, startDate]);

        if (!result.affectedRows) {
            return res.status(404).json({ 
                success: false,
                message: 'Duration not found' 
            });
        }

        res.status(200).json({ 
            success: true,
            message: 'Duration deleted' 
        });
    } catch (err) {
        console.error('Error deleting duration:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
};