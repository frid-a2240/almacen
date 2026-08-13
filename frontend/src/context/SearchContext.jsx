import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const SearchContext = createContext({ query: '', setQuery: () => {} })

/**
 * Estado del buscador de la barra superior, compartido entre TopAppBar (que
 * dibuja el input) y la página activa (que filtra su lista). Se limpia solo
 * al cambiar de vista para no dejar un filtro de PRODUCTOS aplicado por
 * accidente al entrar a EMPLEADOS.
 */
export function SearchProvider({ children }) {
  const [query, setQuery] = useState('')
  const location = useLocation()

  useEffect(() => {
    setQuery('')
  }, [location.pathname])

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  return useContext(SearchContext)
}
