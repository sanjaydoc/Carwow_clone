"""Ingest & QC (D2): parse real genotype + methylation files on-device."""

from .genotype import Genotype, load_genotype
from .methylation import Methylation, load_methylation

__all__ = ["Genotype", "load_genotype", "Methylation", "load_methylation"]
