from common.swagger_utils import swagger_tags_for_viewset

from .views import ModuleViewSet


# it's done cause decorating not overwritten methods will decorate all methods that come from ModuleViewSet
@swagger_tags_for_viewset(tags=["module"])
class SwaggeredModuleViewSet(ModuleViewSet):
    def list(self, request, *args, **kwargs):
        super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
