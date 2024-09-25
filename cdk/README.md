Due to a bug with `aws configure sso` and aws cdk, you may need to pass in profile like so:

```
AWS_DEFAULT_PROFILE=<PROFILE_NAME_HERE> npm run build
```

Instead of:

```
# Will result in error
npm run build -- --profile AWS_DEFAULT_PROFILE=ProfileName
```

Bootstrap and deploy to account likewise.

Note that this CDK package assumes the hosted zone was created manually.
