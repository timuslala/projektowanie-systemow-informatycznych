from django.apps import AppConfig


class ModuleConfig(AppConfig):
    name = "module"

    def ready(self):
        from django.conf import settings
        if not settings.PRODUCTION:
            try:
                from .aws import s3_client
                s3_client.create_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
                print(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} created or already exists.")
            except Exception:
                pass
