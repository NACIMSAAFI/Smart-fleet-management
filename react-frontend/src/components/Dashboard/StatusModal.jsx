import React from 'react';

const StatusModal = ({
  vehicle,
  date,
  formData,
  onFormChange,
  onSubmit,
  onDelete,
  onClose
}) => {
  const calculateDateRange = () => {
    if (!date) return { startDateDisplay: '', endDateDisplay: '' };

    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + parseInt(formData.duration || 1) - 1);

    return {
      startDateDisplay: startDate.toLocaleDateString(),
      endDateDisplay: endDate.toLocaleDateString()
    };
  };

  const { startDateDisplay, endDateDisplay } = calculateDateRange();

  return (
    <div className="modal-backdrop">
      <div className="status-modal">
        <div className="modal-header">
          <h2>
            {vehicle?.brand} {vehicle?.model} - {date}
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Status:</label>
            <select
              name="status"
              value={formData.status}
              onChange={onFormChange}
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="reserved">Reserved</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="form-group">
            <label>Duration (days):</label>
            <input
              type="number"
              name="duration"
              min="1"
              max="31"
              value={formData.duration}
              onChange={onFormChange}
            />
          </div>

          <div className="form-group date-range-display">
            <span>Period: {startDateDisplay} - {endDateDisplay}</span>
          </div>

          {(formData.status === 'rented' || formData.status === 'reserved') && (
            <>
              <div className="form-group">
                <label>Client Name:</label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={onFormChange}
                />
              </div>

              <div className="form-group">
                <label>Client Phone:</label>
                <input
                  type="text"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={onFormChange}
                />
              </div>

              <div className="form-group">
                <label>Rental Price/Day:</label>
                <input
                  type="number"
                  name="rentalPrice"
                  value={formData.rentalPrice}
                  onChange={onFormChange}
                />
              </div>
            </>
          )}

          {formData.status === 'maintenance' && (
            <div className="form-group">
              <label>Maintenance Cause:</label>
              <textarea
                name="cause"
                value={formData.cause}
                onChange={onFormChange}
              ></textarea>
            </div>
          )}

          <div className="modal-actions">
            {formData.status !== 'available' && (
              <button
                type="button"
                className="delete-button"
                onClick={onDelete}
              >
                Delete
              </button>
            )}
            <button type="submit" className="save-button">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StatusModal; 