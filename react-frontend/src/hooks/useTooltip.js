import { useRef, useEffect } from 'react';

export const useTooltip = () => {
  const tooltipRef = useRef(null);

  useEffect(() => {
    const initTooltip = () => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      document.body.appendChild(tooltip);
      tooltipRef.current = tooltip;
    };

    initTooltip();

    return () => {
      if (tooltipRef.current) {
        document.body.removeChild(tooltipRef.current);
      }
    };
  }, []);

  const showTooltip = (event, cell) => {
    if (cell.classList.contains('available') || !tooltipRef.current) {
      return;
    }

    const vehicleId = cell.dataset.vehicleId;
    const vehicle = cell.dataset.vehicleInfo;
    const status = cell.dataset.status;
    const startDate = new Date(cell.dataset.startDate).toLocaleDateString();
    const endDate = new Date(cell.dataset.endDate).toLocaleDateString();
    const currentDate = new Date(cell.dataset.date).toLocaleDateString();
    const duration = (new Date(cell.dataset.endDate) - new Date(cell.dataset.startDate)) / (1000 * 60 * 60 * 24) + 1;

    const clientName = cell.dataset.clientName;
    const clientPhone = cell.dataset.clientPhone;
    const rentalPrice = cell.dataset.rentalPrice;
    const maintenanceCause = cell.dataset.cause;

    let tooltipContent = '';
    let tooltipHeader = '';

    if (status === 'rented' || status === 'reserved') {
      tooltipHeader = status === 'rented' ? 'RENTAL INFORMATION' : 'RESERVATION INFORMATION';
      tooltipContent = `
        <div class="tooltip-content">
          <span class="tooltip-label">Vehicle:</span>
          <span class="tooltip-value">${vehicle}</span>
          
          <span class="tooltip-label">Period:</span>
          <span class="tooltip-value">${startDate} to ${endDate} (${duration} days)</span>
          
          <span class="tooltip-label">Current Day:</span>
          <span class="tooltip-value">${currentDate}</span>
          
          <span class="tooltip-label">Client:</span>
          <span class="tooltip-value">${clientName || 'Not specified'}</span>
          
          <span class="tooltip-label">Phone:</span>
          <span class="tooltip-value">${clientPhone || 'Not specified'}</span>
      `;

      if (rentalPrice && !isNaN(rentalPrice)) {
        const totalPrice = (parseFloat(rentalPrice) * duration).toFixed(2);
        tooltipContent += `
          <span class="tooltip-label">Price:</span>
          <span class="tooltip-value">$${rentalPrice}/day ($${totalPrice} total)</span>
        `;
      } else {
        tooltipContent += `
          <span class="tooltip-label">Price:</span>
          <span class="tooltip-value">Not specified</span>
        `;
      }
    } else if (status === 'maintenance') {
      tooltipHeader = 'MAINTENANCE INFORMATION';
      tooltipContent = `
        <div class="tooltip-content">
          <span class="tooltip-label">Vehicle:</span>
          <span class="tooltip-value">${vehicle}</span>
          
          <span class="tooltip-label">Period:</span>
          <span class="tooltip-value">${startDate} to ${endDate} (${duration} days)</span>
          
          <span class="tooltip-label">Current Day:</span>
          <span class="tooltip-value">${currentDate}</span>
          
          <span class="tooltip-label">Cause:</span>
          <span class="tooltip-value">${maintenanceCause || 'Not specified'}</span>
        </div>
      `;
    }

    tooltipContent += '</div>';

    tooltipRef.current.innerHTML = `<div class="tooltip-header">${tooltipHeader}</div>${tooltipContent}`;
    tooltipRef.current.className = `tooltip ${status}`;
    tooltipRef.current.style.display = 'block';

    moveTooltip(event);
  };

  const hideTooltip = () => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
  };

  const moveTooltip = (event) => {
    if (!tooltipRef.current || tooltipRef.current.style.display === 'none') return;

    const padding = 15;
    let x = event.pageX + padding;
    let y = event.pageY + padding;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x + tooltipRect.width > viewportWidth) {
      x = event.pageX - tooltipRect.width - padding;
    }

    if (y + tooltipRect.height > viewportHeight) {
      y = event.pageY - tooltipRect.height - padding;
    }

    tooltipRef.current.style.left = x + 'px';
    tooltipRef.current.style.top = y + 'px';
  };

  return {
    tooltipRef,
    showTooltip,
    hideTooltip,
    moveTooltip
  };
}; 