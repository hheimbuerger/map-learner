"""MapLearner backend package.

This package contains the backend implementation for the MapLearner application,
including the Flask application and related utilities.
"""

from importlib import metadata

try:
    __version__ = metadata.version(__name__)
except metadata.PackageNotFoundError:  # pragma: no cover
    # package is not installed
    __version__ = "0.0.0"
