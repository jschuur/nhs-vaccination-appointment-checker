require('dotenv').config();

const {
  NHS_URL,
  log,
  setCurrentEligibility,
  getCurrentEligibility,
  checkForChange,
} = require('./lib.js');

// Check every 120 minutes
const CHECK_FREQUENCY = 120;

(async () => {
  // For testing purposes, check for a change immediately, comparing the current text to an empty string
  if (process.env.NODE_ENV === 'dev') checkForChange();
  else setCurrentEligibility(await getCurrentEligibility());

  setInterval(checkForChange, CHECK_FREQUENCY * 60000);

  log(`Monitoring ${NHS_URL} for eligibility changes every ${CHECK_FREQUENCY} minutes ...`);
})();
