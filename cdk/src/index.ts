import { App } from "aws-cdk-lib";
import "dotenv/config";
import { ZolaSiteStack } from "./zola-site-stack";

const app = new App();

new ZolaSiteStack(app, "ZolaSiteStack", {
    // workaround for `--profile` not passing in env for HostedZone.fromLookup
    env: {
        account: process.env["CDK_DEFAULT_ACCOUNT"],
        region: process.env["CDK_DEFAULT_REGION"],
    },
    domainName: process.env["DOMAIN_NAME"]!,
    assetFileLocation: "../../zola/public",
});

app.synth();
