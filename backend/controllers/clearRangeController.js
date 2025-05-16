exports.clearRange = async (req, res) => {
    const { vehicle_id: vehicleId, start_date: startDate, end_date: endDate } = req.body;
    
    if (!vehicleId || !startDate || !endDate) {
        return res.status(400).json({ 
            success: false,
            message: 'All fields are required: vehicleId, startDate, endDate' 
        });
    }

    try {
        await req.userDB.promise().query('START TRANSACTION');

        // Delete statuses in range
        const [statusResult] = await req.userDB.promise().query(`
            DELETE FROM vehicle_statuses
            WHERE vehicle_id = ? AND status_date BETWEEN ? AND ?
        `, [vehicleId, startDate, endDate]);

        // Delete overlapping durations
        const [durationResult] = await req.userDB.promise().query(`
            DELETE FROM rental_durations
            WHERE vehicle_id = ? AND (
                (start_date <= ? AND end_date >= ?) OR
                (start_date <= ? AND end_date >= ?) OR
                (start_date >= ? AND end_date <= ?)
            )
        `, [
            vehicleId,
            startDate, startDate,
            endDate, endDate,
            startDate, endDate
        ]);

        await req.userDB.promise().query('COMMIT');

        res.status(200).json({
            success: true,
            message: 'Range cleared successfully',
            deleted: {
                statuses: statusResult.affectedRows,
                durations: durationResult.affectedRows
            }
        });
    } catch (err) {
        await req.userDB.promise().query('ROLLBACK');
        console.error('Error clearing range:', err);
        res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
};