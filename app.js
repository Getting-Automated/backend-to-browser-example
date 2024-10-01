// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', function() {
    // Handle the availability form submission
    document.getElementById('availability-form').addEventListener('submit', function(e) {
      // Prevent the default form submission behavior
      e.preventDefault();
  
      // Retrieve values from the form inputs
      const dateValue = document.getElementById('date').value; // Preferred date
      const durationValue = document.getElementById('duration').value; // Preferred duration
      const timezoneValue = document.getElementById('timezone').value; // Selected timezone

      // Create Date object for the selected date in the selected timezone
      const selectedDate = new Date(dateValue + 'T00:00:00' + getTimezoneOffset(timezoneValue));

      // Set business hours (e.g., 9 AM to 5 PM)
      const businessStartHour = 9;
      const businessEndHour = 17;

      // Create timeMin (start of business day)
      const timeMin = new Date(selectedDate);
      timeMin.setHours(businessStartHour, 0, 0, 0);

      // Create timeMax (end of business day)
      const timeMax = new Date(selectedDate);
      timeMax.setHours(businessEndHour, 0, 0, 0);

      // Format dates as RFC3339
      const formatRFC3339 = (date) => date.toISOString();

      // Build the query parameters
      const params = new URLSearchParams({
        date: formatRFC3339(selectedDate).split('T')[0], // Send only the date part
        duration: durationValue,
        timeMin: formatRFC3339(timeMin),
        timeMax: formatRFC3339(timeMax),
        timeZone: timezoneValue
      });
  
      // Send a GET request to the webhook URL with query parameters
      fetch(`https://hook.us1.make.com/qkimw7id9d116tepgjqye3xo6a2lkvlm?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
          const availabilityDiv = document.getElementById('availability');
          availabilityDiv.innerHTML = '';

          if (data && typeof data === 'object') {
            const email = Object.keys(data)[0];
            if (data[email] && data[email].busy) {
              const busyTimes = data[email].busy;
              const duration = parseInt(durationValue);

              const availableSlots = getAvailableSlots(timeMin, timeMax, busyTimes, duration, timezoneValue);

              if (availableSlots.length > 0) {
                const heading = document.createElement('h2');
                heading.textContent = 'Available Time Slots:';
                availabilityDiv.appendChild(heading);

                availableSlots.forEach(slot => {
                  const slotButton = document.createElement('div');
                  slotButton.classList.add('time-slot');
                  slotButton.textContent = formatTime(slot, timezoneValue);

                  slotButton.addEventListener('click', function() {
                    document.getElementById('availability-form').style.display = 'none';
                    document.getElementById('booking-form').style.display = 'block';
                    document.getElementById('selected-date').value = dateValue;
                    document.getElementById('selected-time').value = formatTime(slot, timezoneValue);
                    document.getElementById('selected-slot').textContent = `You have selected ${dateValue} at ${formatTime(slot, timezoneValue)} for ${duration} minutes.`;
                  });

                  availabilityDiv.appendChild(slotButton);
                });
              } else {
                availabilityDiv.textContent = 'No available time slots for the selected date and duration.';
              }
            } else {
              availabilityDiv.textContent = 'No availability information returned. Please try again.';
            }
          } else {
            availabilityDiv.textContent = 'Invalid response format. Please try again.';
          }
        })
        .catch(error => {
          console.error('Error:', error);
          const availabilityDiv = document.getElementById('availability');
          availabilityDiv.textContent = `An error occurred: ${error.message}. Please try again later.`;
        });
    });
  
    // The booking form submission remains the same (uses POST)
    document.getElementById('booking-form').addEventListener('submit', function(e) {
      // [Booking code remains unchanged]
    });
  });

// Helper function to get timezone offset
function getTimezoneOffset(timeZone) {
  const date = new Date();
  const options = { timeZone, timeStyle: 'long', hour12: false };
  const timeString = date.toLocaleString('en-US', options);
  const match = timeString.match(/GMT([+-]\d{2}):(\d{2})/);
  if (match) {
    return match[0];
  }
  return '';
}

// Function to get available slots
function getAvailableSlots(timeMin, timeMax, busyTimes, duration, timeZone) {
  const availableSlots = [];
  let currentTime = new Date(timeMin);

  while (currentTime < timeMax) {
    const slotEnd = new Date(currentTime.getTime() + duration * 60000);
    
    if (slotEnd > timeMax) break;

    const isAvailable = busyTimes.every(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return slotEnd <= busyStart || currentTime >= busyEnd;
    });

    if (isAvailable) {
      availableSlots.push(new Date(currentTime));
    }

    currentTime.setMinutes(currentTime.getMinutes() + 15); // Move to next 15-minute slot
  }

  return availableSlots;
}

// Function to format time
function formatTime(date, timeZone) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: timeZone });
}