const db = require('../config/db');

exports.getVehicles = async (req, res) => {
    try {
        const [vehicles] = await db.promise().query(
            'SELECT id, plate_number, brand, model, year, status FROM vehicles ORDER BY id'
        );
        res.status(200).json(vehicles);
    } catch (err) {
        console.error('Error fetching vehicles:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to load vehicles' 
        });
    }
};

exports.addVehicle = async (req, res) => {
    const { plate_number, chassis_number, brand, model, year, status } = req.body;

    if (!plate_number || !chassis_number || !brand || !model) {
        return res.status(400).json({ message: 'Required fields: plate_number, chassis_number, brand, model' });
    }

    try {
        // Check for existing plate number
        const [existingPlate] = await db.promise().query(
            'SELECT id FROM vehicles WHERE plate_number = ?', 
            [plate_number]
        );
        
        if (existingPlate.length > 0) {
            return res.status(409).json({ message: 'Vehicle with this plate number already exists' });
        }

        // Check for existing chassis number
        const [existingChassis] = await db.promise().query(
            'SELECT id FROM vehicles WHERE chassis_number = ?', 
            [chassis_number]
        );
        
        if (existingChassis.length > 0) {
            return res.status(409).json({ message: 'Vehicle with this chassis number already exists' });
        }

        const [result] = await db.promise().query(
            'INSERT INTO vehicles (plate_number, chassis_number, brand, model, year, status) VALUES (?, ?, ?, ?, ?, ?)',
            [plate_number, chassis_number, brand, model, year || null, status || 'available']
        );

        res.status(201).json({
            success: true,
            message: 'Vehicle added successfully',
            id: result.insertId
        });
    } catch (err) {
        console.error('Error adding vehicle:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error' 
        });
    }
};

exports.updateVehicle = async (req, res) => {
    const { id } = req.params;
    const { plate_number, brand, model, year, status } = req.body;

    if (!plate_number || !brand || !model) {
        return res.status(400).json({ message: 'Required fields: plate_number, brand, model' });
    }

    try {
        // Check if vehicle exists
        const [vehicle] = await db.promise().query(
            'SELECT id FROM vehicles WHERE id = ?', 
            [id]
        );
        
        if (!vehicle.length) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        // Check if plate number is already used by another vehicle
        if (plate_number) {
            const [existing] = await db.promise().query(
                'SELECT id FROM vehicles WHERE plate_number = ? AND id != ?', 
                [plate_number, id]
            );
            
            if (existing.length > 0) {
                return res.status(409).json({ message: 'Vehicle with this plate number already exists' });
            }
        }

        await db.promise().query(
            'UPDATE vehicles SET plate_number = ?, brand = ?, model = ?, year = ?, status = ? WHERE id = ?',
            [plate_number, brand, model, year || null, status || 'available', id]
        );

        res.status(200).json({
            success: true,
            message: 'Vehicle updated successfully'
        });
    } catch (err) {
        console.error('Error updating vehicle:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error' 
        });
    }
};

exports.deleteVehicle = async (req, res) => {
    const { id } = req.params;

    try {
        const [vehicle] = await db.promise().query(
            'SELECT id FROM vehicles WHERE id = ?', 
            [id]
        );
        
        if (!vehicle.length) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        // First delete all related records
        await db.promise().query('DELETE FROM vehicle_statuses WHERE vehicle_id = ?', [id]);
        await db.promise().query('DELETE FROM rental_durations WHERE vehicle_id = ?', [id]);
        
        // Then delete the vehicle
        await db.promise().query('DELETE FROM vehicles WHERE id = ?', [id]);
        
        res.status(200).json({
            success: true,
            message: 'Vehicle deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting vehicle:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error' 
        });
    }
};