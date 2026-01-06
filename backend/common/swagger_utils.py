from drf_yasg.inspectors import SwaggerAutoSchema


def swagger_tags(tags):
    def decorator(viewset):
        viewset.swagger_tags = tags
        return viewset

    return decorator


class CustomAutoSchema(SwaggerAutoSchema):
    def get_tags(self, operation_keys=None):
        # First priority: tags from @swagger_auto_schema on the specific action/method
        if "tags" in self.overrides:
            return self.overrides["tags"]

        # Second priority: view-level tags from your @swagger_tags decorator
        if hasattr(self.view, "swagger_tags"):
            return self.view.swagger_tags

        # Fallback to default drf-yasg behavior (usually the basename or first part of path)
        return super().get_tags(operation_keys)
