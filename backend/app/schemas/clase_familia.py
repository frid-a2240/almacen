from pydantic import BaseModel, ConfigDict
from typing import Optional


class ClaseFamiliaBase(BaseModel):
    id_clase_fam: Optional[str] = None
    clase_familia: str


class ClaseFamiliaCreate(ClaseFamiliaBase):
    pass


class ClaseFamiliaUpdate(BaseModel):
    id_clase_fam: Optional[str] = None
    clase_familia: Optional[str] = None


class ClaseFamiliaOut(ClaseFamiliaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    num_productos: int = 0
