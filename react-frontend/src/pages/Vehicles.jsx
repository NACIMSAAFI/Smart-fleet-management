// src/pages/Vehicles.jsx
import { useState, useEffect } from 'react';
import { FaCar, FaPlus, FaSyncAlt, FaEye, FaTrash, FaSearch } from 'react-icons/fa';
import { getAllVehicles as getVehicles, deleteVehicle } from '../services/vehicleService';
import { Link } from 'react-router-dom';


const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
  try {
    setLoading(true);
    setError('');
    const response = await getVehicles();
    console.log('API Response:', response); // Debug log
    
    // Check both response.data.success and response.data.data
    if (response.data?.success && Array.isArray(response.data.data)) {
      setVehicles(response.data.data);
      console.log('Vehicles set:', response.data.data); // Debug log
    } else {
      setError(response.data?.message || 'Failed to fetch vehicles');
    }
  } catch (err) {
    console.error('Fetch error:', err);
    setError(err.message || 'Failed to fetch vehicles');
  } finally {
    setLoading(false);
  }
};

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        const response = await deleteVehicle(id);
        if (response.success) {
          setVehicles(vehicles.filter(vehicle => vehicle.id !== id));
        } else {
          setError(response.message || 'Failed to delete vehicle');
        }
      } catch (err) {
        setError(err.message || 'Failed to delete vehicle');
      }
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    `${vehicle.brand} ${vehicle.model} ${vehicle.plate_number} ${vehicle.chassis_number}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading">
        <span className="spinner"></span> Loading vehicles...
      </div>
    );
  }

  if (error) {
    return <div className="message error">{error}</div>;
  }

  return (
    <div className="container">
      <h1><FaCar /> Vehicle Fleet Management</h1>
      
      {error && <div className="message error">{error}</div>}
      
      <div className="action-toolbar">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="action-buttons">
          <Link to="/vehicles/add" className="btn">
            <FaPlus /> Add New Vehicle
          </Link>
          <button onClick={fetchVehicles} className="btn btn-secondary">
            <FaSyncAlt /> Refresh
          </button>
        </div>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Plate Number</th>
              <th>Chassis Number</th>
              <th>Brand</th>
              <th>Model</th>
              <th>Year</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map(vehicle => (
                <tr key={vehicle.id}>
                  <td>{vehicle.plate_number}</td>
                  <td>{vehicle.chassis_number || '-'}</td>
                  <td>{vehicle.brand}</td>
                  <td>{vehicle.model}</td>
                  <td>{vehicle.year}</td>
                  <td className="table-action-cell">
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="btn btn-danger btn-sm"
                    >
                      <FaTrash /> Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">
                  No vehicles found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Vehicles;