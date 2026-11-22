// adapted from: https://github.com/aws-samples/aws-cdk-examples/tree/4833109a2d24f804bd9e20a80b0d17be692db210/typescript/static-site

import { StackProps, Stack, Duration, RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import {
    Certificate,
    CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import {
    AllowedMethods,
    CachePolicy,
    Distribution,
    OriginAccessIdentity,
    ResponseHeadersPolicy,
    SecurityPolicyProtocol,
    ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
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
    domainName: string;
    assetFileLocation: string;
    ruinaViewerLocation: string;
    lobocorpViewerLocation: string;
}

const RUINA_VIEWER_PREFIX = "ruina-sprite-viewer";
const LOBOCORP_VIEWER_PREFIX = "lobocorp-sprite-viewer";

export class ZolaSiteStack extends Stack {
    readonly zone: IHostedZone;
    readonly wwwDomain: string;
    readonly cloudfrontOAI: OriginAccessIdentity;
    readonly siteBucket: Bucket;
    readonly wwwBucket: Bucket;
    readonly spriteAssetBucket: Bucket;
    readonly certificate: Certificate;
    readonly wwwCloudfrontDistribution: Distribution;
    readonly siteCloudfrontDistribution: Distribution;

    constructor(scope: Construct, id: string, props: ZolaSiteStackProps) {
        super(scope, id, props);

        this.zone = HostedZone.fromLookup(this, "Zone", {
            domainName: props.domainName,
        });
  
        this.wwwDomain = `www.${props.domainName}`;
        this.cloudfrontOAI = new OriginAccessIdentity(this, "cloudfront-OAI", {
            comment: `OAI for ${id}`,
        });

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

        this.spriteAssetBucket = new Bucket(this, "SpriteAssetBucket", {
            publicReadAccess: false,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            removalPolicy: RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
        });

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

        this.certificate = new Certificate(this, "Certificate", {
            domainName: props.domainName,
            subjectAlternativeNames: [`*.${props.domainName}`],
            validation: CertificateValidation.fromDns(this.zone),
        });

        const longCacheHeadersPolicy = new ResponseHeadersPolicy(
            this,
            "LongCacheHeadersPolicy",
            {
                customHeadersBehavior: {
                    customHeaders: [
                        {
                            header: "Cache-Control",
                            value: "public, max-age=31536000, immutable",
                            override: true,
                        },
                    ],
                },
            }
        );

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
                additionalBehaviors: {
                    "/assets/*": {
                        origin: S3BucketOrigin.withOriginAccessControl(
                            this.spriteAssetBucket
                        ),
                        compress: true,
                        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
                        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
                        responseHeadersPolicy: longCacheHeadersPolicy,
                        viewerProtocolPolicy:
                            ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    },
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

        new BucketDeployment(this, "DeployWithInvalidation", {
            sources: [
                Source.asset(path.join(__dirname, props.assetFileLocation)),
            ],
            destinationBucket: this.wwwBucket,
            distribution: this.wwwCloudfrontDistribution,
            distributionPaths: ["/*"],
            memoryLimit: 1024,
            exclude: [`${RUINA_VIEWER_PREFIX}/*`, `${LOBOCORP_VIEWER_PREFIX}/*`],
        });

        new BucketDeployment(this, "DeployRuinaSpriteViewer", {
            sources: [
                Source.asset(path.join(__dirname, props.ruinaViewerLocation), {
                    exclude: ["data"],
                }),
            ],
            destinationBucket: this.wwwBucket,
            destinationKeyPrefix: `${RUINA_VIEWER_PREFIX}/`,
            distribution: this.wwwCloudfrontDistribution,
            distributionPaths: [`/${RUINA_VIEWER_PREFIX}/*`],
        });

        new BucketDeployment(this, "DeployLobocorpSpriteViewer", {
            sources: [
                Source.asset(path.join(__dirname, props.lobocorpViewerLocation), {
                    exclude: ["data"],
                }),
            ],
            destinationBucket: this.wwwBucket,
            destinationKeyPrefix: `${LOBOCORP_VIEWER_PREFIX}/`,
            distribution: this.wwwCloudfrontDistribution,
            distributionPaths: [`/${LOBOCORP_VIEWER_PREFIX}/*`],
        });
    }
}
