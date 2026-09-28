"""Run the persistent analysis queue in a separate process."""

import logging

from sqlalchemy.orm import sessionmaker

from app.db.connection import get_engine
from app.services.analysis_jobs import run_worker


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    factory = sessionmaker(bind=get_engine(), expire_on_commit=False)
    run_worker(factory)


if __name__ == "__main__":
    main()
