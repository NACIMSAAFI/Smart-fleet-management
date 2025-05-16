const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : null;

exports.checkConflicts = async (req, res) => {
    const { vehicleId, startDate, endDate } = req.query;
    
    if (!vehicleId || !startDate || !endDate) {
        return res.status(400).json({ 
            success: false,
            message: 'Missing required parameters: vehicleId, startDate, endDate' 
        });
    }

    try {
        const [vehicle] = await req.userDB.promise().query(
            'SELECT id FROM vehicles WHERE id = ?', 
            [vehicleId]
        );
        
        if (!vehicle.length) {
            return res.status(404).json({ 
                success: false,
                message: 'Vehicle not found' 
            });
        }

        const [durations] = await req.userDB.promise().query(`
            SELECT 
                start_date, 
                end_date, 
                is_maintenance
            FROM rental_durations
            WHERE vehicle_id = ?
            AND (
                (start_date <= ? AND end_date >= ?) OR
                (start_date <= ? AND end_date >= ?) OR
                (start_date >= ? AND end_date <= ?)
            )
            LIMIT 1
        `, [vehicleId, startDate, startDate, endDate, endDate, startDate, endDate]);

        if (durations.length) {
            const conflict = durations[0];
            return res.json({
                success: true,
                hasConflict: true,
                conflict: {
                    type: conflict.is_maintenance ? 'maintenance' : 'rental',
                    startDate: formatDate(conflict.start_date),
                    endDate: formatDate(conflict.end_date)
                }
            });
        }

        const [statuses] = await req.userDB.promise().query(`
            SELECT status_date, status 
            FROM vehicle_statuses 
            WHERE vehicle_id = ? 
            AND status_date BETWEEN ? AND ?
            AND status IN ('rented', 'reserved', 'maintenance')
            LIMIT 1
        `, [vehicleId, startDate, endDate]);

        if (statuses.length) {
            return res.json({
                success: true,
                hasConflict: true,
                conflict: {
                    type: statuses[0].status,
                    date: formatDate(statuses[0].status_date)
                }
            });
        }

        res.json({
            success: true,
            hasConflict: false
        });

    } catch (err) {
        console.error('Error checking conflicts:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
};