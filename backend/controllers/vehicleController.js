exports.getVehicles = async (req, res) => {
    try {
        const [vehicles] = await req.userDB.promise().query(
            'SELECT id, plate_number, chassis_number, brand, model, year, status FROM vehicles ORDER BY id'
        );


        res.status(200).json({
            success: true,
            data: vehicles
        });
    } catch (err) {
        console.error('Error fetching vehicles:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to load vehicles',
            error: err.message
        });
    }
};

exports.addVehicle = async (req, res) => {
    const { plate_number, chassis_number, brand, model, year, status } = req.body;

    if (!plate_number || !chassis_number || !brand || !model) {
        return res.status(400).json({ 
            success: false,
            message: 'Required fields: plate_number, chassis_number, brand, model' 
        });
    }

    try {
        const [existingPlate] = await req.userDB.promise().query(
            'SELECT id FROM vehicles WHERE plate_number = ?', 
            [plate_number]
        );
        
        if (existingPlate.length > 0) {
            return res.status(409).json({ 
                success: false,
                message: 'Vehicle with this plate number already exists' 
            });
        }

        const [existingChassis] = await req.userDB.promise().query(
            'SELECT id FROM vehicles WHERE chassis_number = ?', 
            [chassis_number]
        );
        
        if (existingChassis.length > 0) {
            return res.status(409).json({ 
                success: false,
                message: 'Vehicle with this chassis number already exists' 
            });
        }

        const [result] = await req.userDB.promise().query(
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
            message: 'Database error',
            error: err.message
        });
    }
};

exports.updateVehicle = async (req, res) => {
    const { id } = req.params;
    const { plate_number, chassis_number, brand, model, year, status } = req.body;

    if (!plate_number || !chassis_number || !brand || !model) {
        return res.status(400).json({ 
            success: false,
            message: 'Required fields: plate_number, chassis_number, brand, model' 
        });
    }

    try {
        const [vehicle] = await req.userDB.promise().query(
            'SELECT id FROM vehicles WHERE id = ?', 
            [id]
        );
        
        if (!vehicle.length) {
            return res.status(404).json({ 
                success: false,
                message: 'Vehicle not found' 
            });
        }

        if (plate_number) {
            const [existing] = await req.userDB.promise().query(
                'SELECT id FROM vehicles WHERE plate_number = ? AND id != ?', 
                [plate_number, id]
            );
            
            if (existing.length > 0) {
                return res.status(409).json({ 
                    success: false,
                    message: 'Vehicle with this plate number already exists' 
                });
            }
        }

        if (chassis_number) {
            const [existing] = await req.userDB.promise().query(
                'SELECT id FROM vehicles WHERE chassis_number = ? AND id != ?', 
                [chassis_number, id]
            );
            
            if (existing.length > 0) {
                return res.status(409).json({ 
                    success: false,
                    message: 'Vehicle with this chassis number already exists' 
                });
            }
        }

        await req.userDB.promise().query(
            'UPDATE vehicles SET plate_number = ?, chassis_number = ?, brand = ?, model = ?, year = ?, status = ? WHERE id = ?',
            [plate_number, chassis_number, brand, model, year || null, status || 'available', id]
        );

        res.status(200).json({
            success: true,
            message: 'Vehicle updated successfully'
        });
    } catch (err) {
        console.error('Error updating vehicle:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
};

exports.deleteVehicle = async (req, res) => {
    const { id } = req.params;

    try {
        const [vehicle] = await req.userDB.promise().query(
            'SELECT id FROM vehicles WHERE id = ?', 
            [id]
        );
        
        if (!vehicle.length) {
            return res.status(404).json({ 
                success: false,
                message: 'Vehicle not found' 
            });
        }

        await req.userDB.promise().query('DELETE FROM vehicle_statuses WHERE vehicle_id = ?', [id]);
        await req.userDB.promise().query('DELETE FROM rental_durations WHERE vehicle_id = ?', [id]);
        await req.userDB.promise().query('DELETE FROM vehicles WHERE id = ?', [id]);
        
        res.status(200).json({
            success: true,
            message: 'Vehicle deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting vehicle:', err);
        res.status(500).json({ 
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
};