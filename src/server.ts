import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as appInsights from 'applicationinsights';

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize application insights
appInsights.setup(process.env.appKey || "d55a5915-bf62-49e2-83ba-cc78b93cac4b")
           .setAutoDependencyCorrelation(false)
           .setAutoCollectRequests(false)
           .setAutoCollectPerformance(false)
           .setAutoCollectExceptions(false)
           .setAutoCollectDependencies(false)
           .setAutoCollectConsole(false)
           .setUseDiskRetryCaching(false)
           .start();
           
// Get the default AI client
const client = appInsights.defaultClient;

// Specify the site route
app.post('/track', trackData);
// Start listening to requests
app.listen(process.env.PORT || 8080);


/**
 * Track data
 * 
 * @param req 
 * @param res 
 */
async function trackData (req: express.Request, res: express.Response) {
  const { body } = req;

  // Check if there was body
  if (body && body.length > 0) {
    // Set the user-agent. This will be used by appInsights for the browser version
    if (req.headers["user-agent"]) {
      devLoggger("User-Agent", req.headers["user-agent"]);
      client.context.tags["ai.user.userAgent"] = req.headers["user-agent"] as string;
    }

    // Specify the ip address for the geolocation
    if (req.headers['x-forwarded-for'] || req.connection.remoteAddress) {
      devLoggger("x-forwarded-for", req.headers['x-forwarded-for']);
      devLoggger("remoteAddress", req.connection.remoteAddress);
      
      let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      if (ipAddress && typeof ipAddress === "string" && ipAddress.includes(":")) {
        ipAddress = ipAddress.split(":")[0];
      }
      client.context.tags["ai.location.ip"] = ipAddress as string;
      client.context.tags["ai.device.ip"] = ipAddress as string;
      client.context.tags["client-ip"] = ipAddress as string;
    }

    // Loop over all the events
    for (const tEvent of body) {
      // Check if event has a name
      if (tEvent.name) {
        devLoggger({name: tEvent.name, properties: tEvent.properties || {}});
        client.trackEvent({name: tEvent.name, properties: tEvent.properties || {}});
      }
    }
  }

  res.sendStatus(200);
}


/**
 * Log data only when in developer mode
 * 
 * @param msg 
 */
const devLoggger = (...args: any[]) => {
  if (process.env.development) {
    console.log(args);
  }
}