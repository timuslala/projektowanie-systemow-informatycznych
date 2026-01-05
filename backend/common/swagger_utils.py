from drf_yasg.inspectors import SwaggerAutoSchema


def swagger_tags(tags):
    def decorator(viewset):
        viewset.swagger_tags = tags
        return viewset

    return decorator


class CustomAutoSchema(SwaggerAutoSchema):
    def get_tags(self, operation_keys=None):
        # If the view has a 'swagger_tags' attribute, use it
        if hasattr(self.view, "swagger_tags"):
            return self.view.swagger_tags
        # Otherwise fall back to default behavior
        return super().get_tags(operation_keys)
