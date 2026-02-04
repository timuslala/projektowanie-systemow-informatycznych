import secrets

from django.conf import settings
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .aws import s3_client


# Create your models here.
class Module(models.Model):
    name = models.CharField(max_length=255)
    content = models.TextField()
    course = models.ForeignKey("course.Course", on_delete=models.CASCADE)
    photo_id = models.CharField(max_length=64, null=True, blank=True)
    photo_url = models.URLField(null=True, blank=True)

    def upload_photo(self, fileobj):
        import os
        name = getattr(fileobj, "name", "")
        _, ext = os.path.splitext(name)
        ext = ext.lower()
        if ext not in [".png", ".jpg", ".jpeg"]:
            ext = ".png"

        if self.photo_id is None:
            self.photo_id = secrets.token_hex(32)
            """To reach a collision probability of ~50%, ~2^128 calls are needed.
            With a billion stored files, the probability is roughly ~10^-59."""
        
        key = f"{self.photo_id}{ext}"
        s3_client.upload_fileobj(
            Fileobj=fileobj,
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=key,
        )
        if settings.PRODUCTION:
            self.photo_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        else:
            self.photo_url = f"{settings.AWS_S3_PUBLIC_URL}/{settings.AWS_STORAGE_BUCKET_NAME}/{key}"
        self.save()


@receiver(pre_delete, sender=Module)
def pre_delete_module(sender, instance, **kwargs):
    key = f"{instance.photo_id}.png"
    if instance.photo_url:
        key = instance.photo_url.split("/")[-1]
    
    s3_client.delete_object(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key
    )


class ModuleProgress(models.Model):
    user = models.ForeignKey("user.User", on_delete=models.CASCADE)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "module")
