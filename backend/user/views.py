import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.utils.translation import gettext_lazy as _
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer, CharField
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].required = False
        self.fields["email"] = CharField(required=False)

    def validate(self, attrs):
        if "email" in attrs:
            attrs["username"] = attrs["email"]
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token["email"] = user.email
        token["name"] = user.name
        token["surname"] = user.surname
        token["is_teacher"] = user.is_teacher

        return token


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
            validation_code=secrets.token_hex(32),
        )
        link = f"http://localhost:5173/verify-email?email={user.email}&code={user.validation_code}"
        body = f"""Your validation link:

        {link}
        """

        send_mail(
            subject="Email Validation",
            message=body,
            from_email="from@example.com",
            recipient_list=[user.email],
        )
        if not settings.PRODUCTION:
            print(
                "Copy link from here cause of some stuff how console email backend prints emails"
            )
            print(link)
        return user


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


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
            if user.is_active:
                return Response({"message": _("User already active")}, status=400)
            if str(user.validation_code) != str(code):
                return Response({"code": _("Invalid validation code")}, status=400)
            user.is_active = True
            user.validation_code = None
            user.save()
            return Response({"message": _("Email confirmed")}, status=200)
        return Response(
            {"message": _("User with this email does not exist")}, status=400
        )
