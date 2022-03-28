import { PutMetricDataCommand, CloudWatchClient } from "./node_module/@aws-sdk/client-cloudwatch";
import { config } from './.creds'

export async function send_stats(params) {
    const client = new CloudWatchClient(config);
    const command = new PutMetricDataCommand(params);

    try {
        const data = await client.send(command);
        console.log("Success, event sent; requestID:", data);
        return data;
    } catch (err) {
        console.log("Error", err);
    }
}