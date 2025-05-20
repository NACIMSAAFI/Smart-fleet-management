// src/pages/AddVehicle.jsx
import { useState } from 'react';
import { FaPlusCircle, FaArrowLeft } from 'react-icons/fa';
import { addVehicle } from '../services/vehicleService';
import { useNavigate } from 'react-router-dom';

const AddVehicle = () => {
  const [formData, setFormData] = useState({
    plate_number: '',
    chassis_number: '',
    brand: '',
    model: '',
    year: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.plate_number.trim()) newErrors.plate_number = 'Plate number is required';
    if (!formData.brand.trim()) newErrors.brand = 'Brand is required';
    if (!formData.model.trim()) newErrors.model = 'Model is required';
    if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear()) {
      newErrors.year = 'Please enter a valid year';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await addVehicle(formData);
      if (response.success) {
        setMessage('Vehicle added successfully!');
        setTimeout(() => navigate('/vehicles'), 2000);
      } else {
        setMessage(response.message || 'Failed to add vehicle');
      }
    } catch (err) {
      setMessage(err.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <FaPlusCircle /> Add New Vehicle
          </h2>
          <button 
            onClick={() => navigate('/vehicles')} 
            className="btn btn-outline"
          >
            <FaArrowLeft /> Back to Vehicles
          </button>
        </div>
        <div className="card-body">
          {message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
          <form id="vehicleForm" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="plate_number">License Plate Number *</label>
                  <input
                    type="text"
                    id="plate_number"
                    name="plate_number"
                    value={formData.plate_number}
                    onChange={handleChange}
                    className={errors.plate_number ? 'error' : ''}
                  />
                  {errors.plate_number && (
                    <span className="error-message">{errors.plate_number}</span>
                  )}
                </div>
              </div>
              <div className="form-col">
                <div className="form-group">
                  <label htmlFor="chassis_number">Chassis Number (VIN)</label>
                  <input
                    type="text"
                    id="chassis_number"
                    name="chassis_number"
                    value={formData.chassis_number}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
  <div className="form-col">
    <div className="form-group">
      <label htmlFor="brand">Brand *</label>
      <input
        type="text"
        id="brand"
        name="brand"
        value={formData.brand}
        onChange={handleChange}
        className={errors.brand ? 'error' : ''}
      />
      {errors.brand && (
        <span className="error-message">{errors.brand}</span>
      )}
    </div>
  </div>
  <div className="form-col">
    <div className="form-group">
      <label htmlFor="model">Model *</label>
      <input
        type="text"
        id="model"
        name="model"
        value={formData.model}
        onChange={handleChange}
        className={errors.model ? 'error' : ''}
      />
      {errors.model && (
        <span className="error-message">{errors.model}</span>
      )}
    </div>
  </div>
</div>

<div className="form-group">
  <label htmlFor="year">Year *</label>
  <input
    type="number"
    id="year"
    name="year"
    min="1900"
    max={new Date().getFullYear()}
    value={formData.year}
    onChange={handleChange}
    className={errors.year ? 'error' : ''}
  />
  {errors.year && (
    <span className="error-message">{errors.year}</span>
  )}
</div>

            <div className="form-actions">
              <button type="button" onClick={() => navigate('/vehicles')} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddVehicle;