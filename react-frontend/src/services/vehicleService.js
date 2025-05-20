import api from './api';

// Vehicle CRUD Operations
export const getAllVehicles = async () => {
  try {
    const response = await api.get('/vehicles');
    console.log('Vehicles API Response:', response); // Debug log
    
    // Return the entire response object, not just the data
    // This matches what the Dashboard component expects
    return response;
  } catch (error) {
    console.error('Failed to fetch vehicles:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error; // Re-throw for error boundaries
  }
};

export const getVehicleById = async (id) => {
  try {
    const response = await api.get(`/vehicles/${id}`);
    return {
      success: response.data.success,
      data: response.data.data || null,
      message: response.data.message || 'Vehicle details loaded'
    };
  } catch (error) {
    console.error(`Failed to fetch vehicle ${id}:`, error);
    throw error;
  }
};

export const addVehicle = async (vehicleData) => {
  try {
    const response = await api.post('/vehicles', vehicleData);
    return {
      success: response.data.success,
      data: response.data.data || null,
      message: response.data.message || 'Vehicle added successfully'
    };
  } catch (error) {
    console.error('Failed to add vehicle:', error);
    throw error;
  }
};

export const updateVehicle = async (id, vehicleData) => {
  try {
    const response = await api.put(`/vehicles/${id}`, vehicleData);
    return {
      success: response.data.success,
      data: response.data.data || null,
      message: response.data.message || 'Vehicle updated successfully'
    };
  } catch (error) {
    console.error(`Failed to update vehicle ${id}:`, error);
    throw error;
  }
};

export const deleteVehicle = async (id) => {
  try {
    const response = await api.delete(`/vehicles/${id}`);
    return {
      success: response.data.success,
      data: response.data.data || null,
      message: response.data.message || 'Vehicle deleted successfully'
    };
  } catch (error) {
    console.error(`Failed to delete vehicle ${id}:`, error);
    throw error;
  }
};

// Status Management
export const getVehicleStatuses = async (startDate, endDate, vehicleId = null) => {
  const params = {
    start_date: startDate,
    end_date: endDate,
    ...(vehicleId && { vehicle_id: vehicleId })
  };

  try {
    const response = await api.get('/vehicles/statuses', { params });
    console.log('Statuses response:', response.data); // Debug log
    return response;
  } catch (error) {
    console.error('Error fetching statuses:', {
      error: error.message,
      config: error.config,
      response: error.response?.data
    });
    throw error;
  }
};

export const saveVehicleStatus = async (statusData) => {
  try {
    console.log('Saving status:', statusData); // Debug log
    const response = await api.post('/vehicles/statuses', statusData);
    console.log('Save response:', response.data); // Debug log
    return response.data;
  } catch (error) {
    console.error('Error saving status:', {
      error: error.message,
      config: error.config,
      response: error.response?.data
    });
    throw error;
  }
};

export const deleteVehicleStatus = async (vehicleId, date) => {
  try {
    console.log(`Deleting status for vehicle ${vehicleId} on ${date}`); // Debug log
    const response = await api.delete(`/vehicles/statuses/${vehicleId}/${date}`);
    console.log('Delete response:', response.data); // Debug log
    return response.data;
  } catch (error) {
    console.error('Error deleting status:', {
      error: error.message,
      config: error.config,
      response: error.response?.data
    });
    throw error;
  }
};

// Duration Management
export const getVehicleDurations = async (vehicleId, startDate, endDate) => {
  try {
    const params = {
      ...(vehicleId && { vehicle_id: vehicleId }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate })
    };
    
    const response = await api.get('/vehicles/durations', { params });
    return response;
  } catch (error) {
    console.error('Failed to fetch durations:', error);
    throw error;
  }
};

export const saveVehicleDuration = async (durationData) => {
  try {
    const response = await api.post('/vehicles/durations', durationData);
    return {
      success: response.data.success,
      data: response.data.data || null,
      message: response.data.message || 'Duration saved successfully'
    };
  } catch (error) {
    console.error('Failed to save duration:', error);
    throw error;
  }
};

export const deleteVehicleDuration = async (vehicleId, startDate) => {
  try {
    const response = await api.delete(`/vehicles/durations/${vehicleId}/${startDate}`);
    return {
      success: response.data.success,
      data: response.data.data || null,
      message: response.data.message || 'Duration deleted successfully'
    };
  } catch (error) {
    console.error(`Failed to delete duration for vehicle ${vehicleId} starting ${startDate}:`, error);
    throw error;
  }
};

// Conflict Check
export const checkVehicleConflicts = async (vehicleId, startDate, endDate) => {
  try {
    const response = await api.get('/vehicles/conflicts', {
      params: {
        vehicleId: vehicleId,
        startDate: startDate,
        endDate: endDate
      }
    });
    return response.data;
  } catch (error) {
    console.error('Conflict check failed:', error);
    throw error;
  }
};