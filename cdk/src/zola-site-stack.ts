// adapted from: https://github.com/aws-samples/aws-cdk-examples/tree/4833109a2d24f804bd9e20a80b0d17be692db210/typescript/static-site

import { StackProps, Stack, Duration, RemovalPolicy } from "aws-cdk-lib";
import {
    Certificate,
    CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import {
    AllowedMethods,
    Distribution,
    OriginAccessIdentity,
    SecurityPolicyProtocol,
    ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { PolicyStatement, CanonicalUserPrincipal } from "aws-cdk-lib/aws-iam";
import {
    ARecord,
    HostedZone,
    IHostedZone,
    RecordTarget,
} from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import path = require("path");

export interface ZolaSiteStackProps extends StackProps {
    // e.g. site.com
    domainName: string;
    assetFileLocation: string;
}

export class ZolaSiteStack extends Stack {
    readonly zone: IHostedZone;
    readonly wwwDomain: string;
    readonly cloudfrontOAI: OriginAccessIdentity;
    readonly siteBucket: Bucket;
    readonly wwwBucket: Bucket;
    readonly certificate: Certificate;
    readonly wwwCloudfrontDistribution: Distribution;
    readonly siteCloudfrontDistribution: Distribution;

    constructor(scope: Construct, id: string, props: ZolaSiteStackProps) {
        super(scope, id, props);

        this.zone = HostedZone.fromLookup(this, "Zone", {
            domainName: props.domainName,
        });
        // no https:// in front
        this.wwwDomain = `www.${props.domainName}`;
        this.cloudfrontOAI = new OriginAccessIdentity(this, "cloudfront-OAI", {
            comment: `OAI for ${id}`,
        });

        // Content bucket (www.site.com)
        this.wwwBucket = new Bucket(this, "WwwBucket", {
            bucketName: this.wwwDomain,
            publicReadAccess: true,
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: false,
                ignorePublicAcls: true,
                restrictPublicBuckets: false
            },
            removalPolicy: RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            websiteIndexDocument: "index.html",
            websiteErrorDocument: "404.html",
        });
        // Root bucket (site.com)
        this.siteBucket = new Bucket(this, "SiteBucket", {
            bucketName: props.domainName,
            publicReadAccess: false,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            websiteRedirect: {
                hostName: this.wwwDomain,
            },
        });

        // Grant access to cloudfront
        this.wwwBucket.addToResourcePolicy(
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [this.wwwBucket.arnForObjects("*")],
                principals: [
                    new CanonicalUserPrincipal(
                        this.cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
                    ),
                ],
            })
        );
        this.siteBucket.addToResourcePolicy(
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [this.siteBucket.arnForObjects("*")],
                principals: [
                    new CanonicalUserPrincipal(
                        this.cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
                    ),
                ],
            })
        );

        // TLS certificate
        this.certificate = new Certificate(this, "Certificate", {
            domainName: props.domainName,
            subjectAlternativeNames: [`*.${props.domainName}`],
            validation: CertificateValidation.fromDns(this.zone),
        });

        // CloudFront distribution
        this.wwwCloudfrontDistribution = new Distribution(
            this,
            "WwwDistribution",
            {
                certificate: this.certificate,
                defaultRootObject: "index.html",
                domainNames: [this.wwwDomain],
                minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
                errorResponses: [
                    {
                        httpStatus: 403,
                        responseHttpStatus: 403,
                        responsePagePath: "/error.html",
                        ttl: Duration.minutes(30),
                    },
                ],
                defaultBehavior: {
                    origin: new S3Origin(this.wwwBucket, {
                        originAccessIdentity: this.cloudfrontOAI,
                    }),
                    compress: true,
                    allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    viewerProtocolPolicy:
                        ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                },
            }
        );
        this.siteCloudfrontDistribution = new Distribution(
            this,
            "SiteDistribution",
            {
                certificate: this.certificate,
                defaultRootObject: "index.html",
                domainNames: [props.domainName],
                minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
                errorResponses: [
                    {
                        httpStatus: 403,
                        responseHttpStatus: 403,
                        responsePagePath: "/error.html",
                        ttl: Duration.minutes(30),
                    },
                ],
                defaultBehavior: {
                    origin: new S3Origin(this.siteBucket, {
                        originAccessIdentity: this.cloudfrontOAI,
                    }),
                    compress: true,
                    allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    viewerProtocolPolicy:
                        ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                },
            }
        );

        // Route53 alias record for the CloudFront distribution
        new ARecord(this, "WwwAliasRecord", {
            recordName: this.wwwDomain,
            target: RecordTarget.fromAlias(
                new CloudFrontTarget(this.wwwCloudfrontDistribution)
            ),
            zone: this.zone,
        });
        new ARecord(this, "SiteAliasRecord", {
            recordName: props.domainName,
            target: RecordTarget.fromAlias(
                new CloudFrontTarget(this.siteCloudfrontDistribution)
            ),
            zone: this.zone,
        });

        // Deploy site contents to S3 bucket
        new BucketDeployment(this, "DeployWithInvalidation", {
            sources: [
                Source.asset(path.join(__dirname, props.assetFileLocation)),
            ],
            destinationBucket: this.wwwBucket,
            distribution: this.wwwCloudfrontDistribution,
            distributionPaths: ["/*"],
            memoryLimit: 1024,
        });
    }
}
