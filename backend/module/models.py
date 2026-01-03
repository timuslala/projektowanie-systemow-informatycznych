from django.conf import settings
from django.db import models
from .aws import s3

# Create your models here.
class Module(models.Model):
    name = models.CharField(max_length=255)
    content = models.TextField()
    course = models.ForeignKey('course.Course', on_delete=models.CASCADE)
    photo_url = models.URLField(null=True, blank=True)

    def upload_photo(self, fileobj):
        s3.upload_fileobj(
            Fileobj=fileobj,
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=f"{self.id}.png",
        )
        if settings.PRODUCTION:
            self.photo_url = f'https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{self.id}.png'
        else:
            self.photo_url = f'{settings.AWS_S3_ENDPOINT_URL}/{settings.AWS_STORAGE_BUCKET_NAME}/{self.id}.png'
        self.save()

