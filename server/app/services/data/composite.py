# Deprecated: use repository.ProductRepository instead.
# Kept for backward compatibility during migration.
from .repository import ProductRepository as CompositeProductRepository  # noqa: F401
from .repository import ProductRepository as MongoDBRepository  # noqa: F401
