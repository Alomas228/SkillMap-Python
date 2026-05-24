"""Сериализаторы DRF — DTO между моделями и JSON."""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Project, Skill, User, UserProject, UserSkill

ALLOWED_LEVELS = ["Intern", "Junior", "Middle", "Senior"]


class UserPublicSerializer(serializers.ModelSerializer):
    publicId = serializers.UUIDField(source="public_id", read_only=True)
    fullName = serializers.CharField(source="full_name", read_only=True)

    class Meta:
        model = User
        fields = ["publicId", "email", "fullName", "position", "department", "role"]


class CreateUserRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(error_messages={"required": "Email обязателен"})
    password = serializers.CharField(min_length=3)
    confirmPassword = serializers.CharField()
    fullName = serializers.CharField()
    position = serializers.CharField(required=False, allow_blank=True, default="")
    department = serializers.CharField(required=False, allow_blank=True, default="")
    role = serializers.CharField()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirmPassword"]:
            raise serializers.ValidationError({"message": "Пароли не совпадают"})
        return attrs


class LoginRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    rememberMe = serializers.BooleanField(required=False, default=False)


class SkillmapTokens(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class SkillMapTokenObtainSerializer(TokenObtainPairSerializer):
    """Не используется напрямую: логин обрабатывает api.views.auth.LoginView,
    но класс зарегистрирован в settings.SIMPLE_JWT на случай прямого вызова.
    """

    username_field = "email"

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["role"] = user.role
        token["full_name"] = user.full_name
        return token


def issue_tokens_for_user(user) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["email"] = user.email
    refresh["role"] = user.role
    refresh["full_name"] = user.full_name
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class SkillSerializer(serializers.ModelSerializer):
    Id = serializers.IntegerField(source="id", read_only=True)
    Name = serializers.CharField(source="name", read_only=True)
    Category = serializers.CharField(source="category", read_only=True)
    IsActive = serializers.BooleanField(source="is_active", read_only=True)

    class Meta:
        model = Skill
        fields = ["Id", "Name", "Category", "IsActive"]


class SkillShortSerializer(serializers.ModelSerializer):
    Id = serializers.IntegerField(source="id", read_only=True)
    Name = serializers.CharField(source="name", read_only=True)
    Category = serializers.CharField(source="category", read_only=True)

    class Meta:
        model = Skill
        fields = ["Id", "Name", "Category"]


class CreateSkillRequestSerializer(serializers.Serializer):
    name = serializers.CharField(error_messages={"required": "Название навыка обязательно"})
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")


class AddUserSkillRequestSerializer(serializers.Serializer):
    skillId = serializers.IntegerField()
    level = serializers.CharField()

    def validate_level(self, value):
        if value not in ALLOWED_LEVELS:
            raise serializers.ValidationError("Недопустимый уровень навыка")
        return value


class UpdateSkillLevelRequestSerializer(serializers.Serializer):
    level = serializers.CharField()

    def validate_level(self, value):
        if value not in ALLOWED_LEVELS:
            raise serializers.ValidationError("Недопустимый уровень навыка")
        return value


class CreateProjectRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    startDate = serializers.DateTimeField(required=False, allow_null=True)
    endDate = serializers.DateTimeField(required=False, allow_null=True)


class AddMemberRequestSerializer(serializers.Serializer):
    publicId = serializers.UUIDField()
