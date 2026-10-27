import Storage from './storage'

// G3 (docs/DECISIONES_TECNICAS.md): un 401 en una solicitud autenticada significa que el token
// ya no vale. Se limpia la sesión y se lleva al login con el aviso, en vez de
// dejar la vista vacía sin explicación. Varias solicitudes pueden fallar a la
// vez: la bandera evita redirigir más de una.
let expiringSession = false

function expireSession() {
    if (expiringSession) return
    expiringSession = true
    new Storage().clearSession()
    const target = { name: 'login', query: { session: 'expired' } }
    // Import dinámico: el router importa las vistas, y las vistas importan este
    // archivo; un import estático armaría un ciclo.
    import('@/router')
        .then(({ default: router }) => router.push(target))
        .catch(() => window.location.assign('/login?session=expired'))
        .finally(() => { expiringSession = false })
}

function checkSession(status, headers) {
    // Solo si la solicitud llevaba token: el login sin token responde 400/401
    // con credenciales inválidas y eso no es una sesión vencida.
    if (status === 401 && headers && headers.Authorization) expireSession()
}

// Para los logs: sin la query, que puede llevar identificadores.
function withoutQuery(url) {
    return String(url).split('?')[0]
}

class Http {
    constructor() {
        // Selección automática de URL basada en el entorno (Desarrollo vs Producción)
        if (process.env.NODE_ENV === 'production') {
            // Solo la variable de entorno: el respaldo apuntaba al backend de la
            // plataforma original, y un build mal configurado le habría enviado
            // los datos sin avisar.
            this.APIUrl = process.env.VUE_APP_API_URL_REMOTE
            if (!this.APIUrl) {
                console.error('VUE_APP_API_URL_REMOTE no estaba definida al compilar: el panel no sabe a qué backend llamar.')
            }
        } else {
            this.APIUrl = 'http://localhost:8000'
        }

        this.storage = new Storage()

        if (typeof Http.instance === 'object') {
            return Http.instance
        }

        Http.instance = this
        return this
    }

    async manageFetch(url, method, body = {}, headers = {}, options = {}) {
        // Tope opcional de espera (logout): con el backend en arranque en frío
        // una solicitud puede tardar decenas de segundos.
        const controller = options.timeoutMs ? new AbortController() : null
        const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs) : null
        try {
            const requestData = {
                method,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            }
            if (controller) requestData.signal = controller.signal
            if (method !== 'GET') {
                requestData.body = JSON.stringify(body)
            }
            let request = await fetch(url, requestData)
            if (!options.skipSessionCheck) checkSession(request.status, headers)
            if (method === 'GET' || url.includes('login')) {
                // Un cuerpo vacío (p. ej. el 404 de una lista sin elementos)
                // daba un error de JSON y se perdía el código de estado.
                const text = await request.text()
                let json = null
                if (text) {
                    try {
                        json = JSON.parse(text)
                    } catch (e) {
                        json = null
                    }
                }
                return {
                    data: json,
                    status: request.status,
                }
            } else {
                return {
                    request,
                }
            }
        } catch (error) {
            console.error(
                `Http ${method} method on ${withoutQuery(url)} failed with error ${error}`
            )
            return {
                error: true,
            }
        } finally {
            if (timer) clearTimeout(timer)
        }
    }

    async manageFetchFormData(url, method, form, headers = {}) {
        try {
            const requestData = {
                method,
                headers,
                body: form,
            }
            let request = await fetch(url, requestData)
            checkSession(request.status, headers)
            let json = await request.json()
            return {
                status: request.status,
                data: json,
            }
        } catch (error) {
            console.error(
                `Http ${method} method on ${withoutQuery(url)} failed with error ${error}`
            )
            throw Error(error)
        }
    }

    authHeader() {
        return {Authorization: `Token ${localStorage.getItem('access_token')}`}
    }

    async get(endpoint, headers = {}) {
        return await this.manageFetch(this.APIUrl + endpoint, 'GET', {}, headers)
    }

    async post(endpoint, body, headers = {}) {
        return await this.manageFetch(this.APIUrl + endpoint, 'POST', body, headers)
    }

    async put(endpoint, body, headers = {}) {
        return await this.manageFetch(this.APIUrl + endpoint, 'PUT', body, headers)
    }

    async patch(endpoint, body, headers = {}) {
        return await this.manageFetch(
            this.APIUrl + endpoint,
            'PATCH',
            body,
            headers
        )
    }

    async delete(endpoint, headers = {}) {
        return await this.manageFetch(this.APIUrl + endpoint, 'DELETE', {}, headers)
    }

    async postFormData(endpoint, form, headers = {}) {
        return await this.manageFetchFormData(
            this.APIUrl + endpoint,
            'POST',
            form,
            headers
        )
    }

    async authGet(endpoint) {
        return await this.get(endpoint, this.authHeader())
    }

    async authPost(endpoint, body) {
        return await this.post(endpoint, body, this.authHeader())
    }

    async authPut(endpoint, body) {
        return await this.put(endpoint, body, this.authHeader())
    }

    async authPatch(endpoint, body) {
        return await this.patch(endpoint, body, this.authHeader())
    }

    async authDelete(endpoint) {
        return await this.delete(endpoint, this.authHeader())
    }

    async authPostFormData(endpoint, form) {
        return await this.postFormData(endpoint, form, this.authHeader())
    }

    /**
     * Revoca el token en el backend (POST /auth/users/logout/). Quien llama
     * limpia la sesión local pase lo que pase: un fallo, un tope de espera o
     * un token ya vencido no deben impedir cerrar sesión ni mostrar el aviso
     * de "sesión expirada".
     */
    async logout() {
        return await this.manageFetch(
            this.APIUrl + '/auth/users/logout/', 'POST', {}, this.authHeader(),
            { skipSessionCheck: true, timeoutMs: 5000 }
        )
    }
}

export default Http
