import random

from django.core.mail import send_mail
from django.utils.translation import gettext_lazy as _
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer

from .models import User


class RegisterSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ("email", "password", "name", "surname", "is_teacher")
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            name=validated_data["name"],
            surname=validated_data["surname"],
            is_teacher=validated_data["is_teacher"],
            is_active=False,
            validation_code=random.randint(100000, 999999),
        )
        send_mail(
            "Email Validation",
            f"Your validation link is: http://localhost:3000/api/validate?email={user.email}&code={user.validation_code}",
            "from@example.com",
            [user.email],
            fail_silently=False,
        )
        return user


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class EmailValidationView(generics.GenericAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                "email",
                openapi.IN_PATH,
                description="User's email to validate",
                type=openapi.TYPE_STRING,
                required=True,
            ),
            openapi.Parameter(
                "code",
                openapi.IN_PATH,
                description="Validation code sent to email",
                type=openapi.TYPE_STRING,
                required=True,
            ),
        ]
    )
    def get(self, request):
        email = request.GET.get("email")
        code = request.GET.get("code")
        print(email, code)
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            if str(user.validation_code) != str(code):
                return Response({"code": _("Invalid validation code")}, status=400)
            user.is_active = True
            user.validation_code = ""
            user.save()
            return Response({"message": _("Email confirmed")}, status=200)
        return Response(
            {"message": _("User with this email does not exist")}, status=400
        )
