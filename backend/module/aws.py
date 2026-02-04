import json

import boto3
from django.conf import settings

session = boto3.Session(
    region_name=settings.AWS_REGION,
)

s3 = session.resource(
    "s3",
    endpoint_url=settings.AWS_S3_ENDPOINT_URL,
)
s3_client = session.client(
    "s3",
    endpoint_url=settings.AWS_S3_ENDPOINT_URL,
)
