"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, re_path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenRefreshView,
)

from course.views import CourseViewSet, UserInfoView
from module.views import ModuleImageView, ModuleViewSet
from user.views import CustomTokenObtainPairView, EmailValidationView, RegisterView

schema_view = get_schema_view(
    openapi.Info(
        title="Your API",
        default_version="v1",
        description="API documentation",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="you@example.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
    authentication_classes=[],
)
urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "accounts/token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"
    ),
    path("accounts/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("accounts/logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("accounts/register/", RegisterView.as_view(), name="register"),
    path("accounts/validate/", EmailValidationView.as_view(), name="email-validate"),
    path(
        "accounts/check_user_info/<int:user_id>/",
        UserInfoView.as_view(),
        name="user_info",
    ),
    re_path(
        r"^swagger(?P<format>\.json|\.yaml)$",
        schema_view.without_ui(cache_timeout=0),
        name="schema-json",
    ),
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path(
        "api/courses/<int:course_id>/modules/",
        ModuleViewSet.as_view({"get": "list", "post": "create"}),
        name="module-list-by-course",
    ),
    path(
        "api/courses/<int:course_id>/modules/<int:module_id>/",
        ModuleViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="module-detail-by-course",
    ),
    path(
        "api/courses/<int:course_id>/modules/<int:module_id>/image/",
        ModuleImageView.as_view(),
        name="module-image-by-course",
    ),
    path(
        "api/courses/",
        CourseViewSet.as_view(
            {
                "get": "list",
                "post": "create",
            }
        ),
        name="course-list",
    ),
    path(
        "api/courses/<int:course_id>",
        CourseViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
    ),
    path(
        "api/courses/<int:course_id>/enrolled-students/",
        CourseViewSet.as_view(
            {
                "get": "enrolled_students",
            }
        ),
        name="course-enrolled-students",
    ),
    path(
        "api/courses/<int:course_id>/eligible-students/",
        CourseViewSet.as_view(
            {
                "get": "eligible_students",
            }
        ),
        name="course-eligible-students",
    ),
    path(
        "api/courses/<int:course_id>/enroll/<int:student_id>/",
        CourseViewSet.as_view(
            {
                "post": "enroll_student",
            }
        ),
        name="course-enroll-student",
    ),
    path(
        "api/courses/<int:course_id>/unenroll/<int:student_id>/",
        CourseViewSet.as_view(
            {
                "delete": "unenroll_student",
            }
        ),
        name="course-unenroll-student",
    ),
]
