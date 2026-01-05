# common/swagger_utils.py
from drf_yasg.utils import swagger_auto_schema

CRUD_ACTIONS = (
    "list",
    "retrieve",
    "create",
    "update",
    "partial_update",
    "destroy",
)


def swagger_tags_for_viewset(tags):
    def decorator(cls):
        for action in CRUD_ACTIONS:
            if hasattr(cls, action):
                method = getattr(cls, action)

                if hasattr(method, "_swagger_auto_schema"):
                    continue

                setattr(
                    cls,
                    action,
                    swagger_auto_schema(tags=tags)(method),
                )
        return cls

    return decorator
