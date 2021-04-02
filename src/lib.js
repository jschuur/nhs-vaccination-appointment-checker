const Push = require('pushover-notifications');
const path = require('path');
const os = require('os');

const axios = require('axios');
const chalk = require('chalk');
const cheerio = require('cheerio');
const Diff = require('diff');
const { htmlToText } = require('html-to-text');
const notifier = require('node-notifier');

var recentEligibility = '';

const NHS_URL =
  'https://www.nhs.uk/conditions/coronavirus-covid-19/coronavirus-vaccination/book-coronavirus-vaccination/';
// Update as needed
const ELIGIBILITY_SELECTOR = '#maincontent > article > div > div > section:nth-child(2)';

function log(msg) {
  const timeStamp = new Date().toString().split(' ').slice(0, 5).join(' ');

  console.log(`[${timeStamp}] ${msg}`);
}

async function sendNotification(change) {
  const platform = os.platform();

  // If running locally, send desktop notifications
  if (platform === 'darwin' || platform === 'win32')
    notifier.notify({
      title: 'NHS vaccination eligbility change',
      message: 'Check NHS appointment site',
      sound: 'basso',
      contentimage: path.join(__dirname, 'nhs.png'),
      open: NHS_URL,
    });

  // Also notify via Pushover app: https://pushover.net/
  const pushoverConfig = {
    user: process.env['PUSHOVER_USER'],
    token: process.env['PUSHOVER_TOKEN'],
  };

  if (pushoverConfig.user && pushoverConfig.token) {
    const notification = new Push(pushoverConfig);

    await notification.send({
      title: 'NHS vaccination eligibility change',
      message: change,
      sound: 'tugboat',
      priority: 1,
      NHS_URL,
      url_title: 'Check NHS appointment site',
    });
  } else
    log(
      `${chalk.red(
        'Error:'
      )} Could not send Pushover notification without API credentials in .env file.`
    );
}

function setCurrentEligibility(eligibilityText) {
  recentEligibility = eligibilityText;
}

// Grab latest eligibility text
async function getCurrentEligibility() {
  const page = await axios.get(NHS_URL);
  const $ = cheerio.load(page.data);

  // Turn HTML to text, so it's easier to diff line by line later
  return htmlToText($(ELIGIBILITY_SELECTOR).html(), { wordwrap: null });
}

// Create two different diff strings. One with color and a shorter one suitable for unformatted notifications
function highlightChanges(textOne, textTwo) {
  const diff = Diff.diffLines(textTwo, textOne);
  let colorDiff = '',
    simpleDiff = '';

  diff.forEach((part) => {
    const { added, removed, value } = part;

    if (added) {
      colorDiff += chalk.green(value);
      simpleDiff += `Added: '${value}'\n`;
    } else if (removed) {
      colorDiff += chalk.red(value);
      simpleDiff += `Removed: '${value}'\n`;
    } else colorDiff += chalk.grey(value);
  });

  return { colorDiff, simpleDiff };
}

async function checkForChange() {
  try {
    const currentEligibility = await getCurrentEligibility();

    if (currentEligibility !== recentEligibility) {
      const { colorDiff, simpleDiff } = highlightChanges(currentEligibility, recentEligibility);

      log(chalk.green('Found changes!'));
      console.log(colorDiff);

      await sendNotification(simpleDiff);

      recentEligibility = currentEligibility;
    } else {
      log(`No changes detected`);
    }
  } catch (err) {
    log(`${chalk.red('Error: ')} ${err.message}`);
  }
}

module.exports = { NHS_URL, log, setCurrentEligibility, getCurrentEligibility, checkForChange };
