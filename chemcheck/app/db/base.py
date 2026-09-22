"""
Import point for Alembic autogenerate and for test fixtures that need
`Base.metadata` to already know about every table. Every new model
must be imported here or it will be invisible to migrations/tests.
"""
from app.db.base_class import Base  # noqa: F401
from app.models.alert import Alert  # noqa: F401
from app.models.ingredient import Ingredient  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.product_ingredient import ProductIngredient  # noqa: F401
from app.models.reaction import Reaction  # noqa: F401
from app.models.review import Review  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.user_sensitivity import UserSensitivity  # noqa: F401
