class Storage {
    constructor() {
        if (typeof Storage.instance === 'object') {
            return Storage.instance
        }

        Storage.instance = this
        return this
    }
    
    get(key) {
        localStorage.getItem(key)
    }
    set(key, value) {
        localStorage.setItem(key, value)
    }
    remove(key) {
        localStorage.removeItem(key)
    }

    getToken() {
        this.get('access_token')
    }
    setToken(token) {
        this.set('access_token', token)
    }
    removeToken() {
        this.remove('access_token')
    }
    // Todo lo que login.vue guarda de la sesión. Antes "Cerrar sesión" solo
    // borraba el token y dejaba el usuario, sus grupos y permisos en el navegador.
    clearSession() {
        ['access_token', 'user', 'groups', 'permissions'].forEach((key) => this.remove(key))
    }
}

export default Storage