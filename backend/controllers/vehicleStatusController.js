const db = require('../config/db');

const formatDate = (dateInput) => {
    const date = new Date(dateInput);
    // Return local date string (YYYY-MM-DD)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

exports.setVehicleStatus = async (req, res) => {
    const { 
        vehicle_id: vehicleId, 
        status_date: statusDate, 
        status, 
        client_name: clientName, 
        client_phone: clientPhone, 
        rental_price: rentalPrice, 
        cause 
    } = req.body;

    try {
        // Validate required fields
        if (!vehicleId || !statusDate || !status) {
            return res.status(400).json({ message: 'vehicleId, statusDate and status are required' });
        }

        // Check if vehicle exists
        const [vehicle] = await db.promise().query(
            'SELECT id FROM vehicles WHERE id = ?', 
            [vehicleId]
        );
        
        if (!vehicle.length) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        // Process optional fields
        const processedPrice = rentalPrice ? parseFloat(rentalPrice) : null;
        const processedCause = cause || null;

        await db.promise().query(`
            INSERT INTO vehicle_statuses 
            (vehicle_id, status_date, status, client_name, client_phone, rental_price, cause)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status),
                client_name = VALUES(client_name),
                client_phone = VALUES(client_phone),
                rental_price = VALUES(rental_price),
                cause = VALUES(cause)
        `, [
            vehicleId, 
            formatDate(statusDate), 
            status,
            clientName || null,
            clientPhone || null,
            processedPrice,
            processedCause
        ]);

        res.json({ success: true, message: "Status updated successfully" });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ success: false, message: 'Database error during status update' });
    }
};

exports.getStatuses = async (req, res) => {
    const { start_date: startDate, end_date: endDate, vehicle_id: vehicleId } = req.query;
    
    if (!startDate || !endDate) {
        return res.status(400).json({ 
            success: false,
            message: 'Start and end dates are required' 
        });
    }
    
    try {
        let query = `
            SELECT vs.*, v.plate_number, v.brand, v.model
            FROM vehicle_statuses vs
            JOIN vehicles v ON v.id = vs.vehicle_id
            WHERE vs.status_date BETWEEN ? AND ?
        `;
        
        let params = [formatDate(startDate), formatDate(endDate)];
        
        // Add vehicle filter if provided
        if (vehicleId) {
            query += ' AND vs.vehicle_id = ?';
            params.push(vehicleId);
        }
        
        query += ' ORDER BY vs.status_date, v.id';
        
        const [results] = await db.promise().query(query, params);
        
        res.json({
            success: true,
            data: results
        });
    } catch (err) {
        console.error('Error fetching statuses:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Database error while fetching statuses' 
        });
    }
};

exports.deleteStatus = async (req, res) => {
    const { vehicleId, date } = req.params;
    
    try {
        const [result] = await db.promise().query(`
            DELETE FROM vehicle_statuses 
            WHERE vehicle_id = ? AND status_date = ?
        `, [vehicleId, formatDate(date)]);
        
        if (!result.affectedRows) {
            return res.status(404).json({ 
                success: false, 
                message: 'Status not found' 
            });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Status deleted successfully' 
        });
    } catch (err) {
        console.error('Error deleting status:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Database error while deleting status',
            error: err.message 
        });
    }
};