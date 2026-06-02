import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconBriefcase, IconEye, IconEyeOff, IconArrowLeft } from '@tabler/icons-react';
import { authApi, mensajeError } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Paso = 'formulario' | 'verificar';

interface FormData {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
  confirmar_password: string;
}

const formInicial: FormData = { nombre: '', email: '', telefono: '', password: '', confirmar_password: '' };

export default function RegisterPage() {
  const [paso, setPaso] = useState<Paso>('formulario');
  const [form, setForm] = useState<FormData>(formInicial);
  const [codigo, setCodigo] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensajeEnvio, setMensajeEnvio] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (campo: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  };

  const enviarCodigo = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmar_password) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setCargando(true);
    try {
      await authApi.enviarCodigo(form.email, form.telefono);
      setMensajeEnvio(`Código enviado a ${form.email}`);
      setPaso('verificar');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  const completarRegistro = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { data } = await authApi.registro({ ...form, codigo });
      login(data.token, data.usuario);
      navigate('/dashboard');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  const reenviarCodigo = async () => {
    setError('');
    setCargando(true);
    try {
      await authApi.enviarCodigo(form.email, form.telefono);
      setMensajeEnvio(`Código reenviado a ${form.email}`);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-indigo-600 rounded-xl">
            <IconBriefcase size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">JHT Project</h1>
            <p className="text-indigo-300 text-sm">Manager + Chat</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {paso === 'formulario' ? (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Crear cuenta</h2>
              <p className="text-slate-500 text-sm mb-6">Completa tus datos para registrarte</p>

              <form onSubmit={enviarCodigo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={handleChange('nombre')}
                    required
                    minLength={2}
                    placeholder="Juan Pérez"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    required
                    placeholder="tu@correo.com"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={handleChange('telefono')}
                    required
                    placeholder="+573001234567"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Formato internacional: +57XXXXXXXXXX</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={mostrarPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange('password')}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {mostrarPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={form.confirmar_password}
                    onChange={handleChange('confirmar_password')}
                    required
                    placeholder="Repite la contraseña"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {cargando ? 'Enviando código...' : 'Enviar código de verificación'}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setPaso('formulario'); setError(''); }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4"
              >
                <IconArrowLeft size={16} /> Volver
              </button>

              <h2 className="text-xl font-bold text-slate-800 mb-1">Verificar correo</h2>
              <p className="text-slate-500 text-sm mb-1">
                Ingresa el código de 6 dígitos enviado a:
              </p>
              <p className="text-indigo-600 font-medium text-sm mb-6">{form.email}</p>

              {mensajeEnvio && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg mb-4">
                  {mensajeEnvio}
                </div>
              )}

              <form onSubmit={completarRegistro} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código de verificación</label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    placeholder="000000"
                    className="w-full px-3 py-3 border border-slate-200 rounded-lg text-2xl font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cargando || codigo.length !== 6}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>

                <button
                  type="button"
                  onClick={reenviarCodigo}
                  disabled={cargando}
                  className="w-full py-2 text-slate-500 hover:text-indigo-600 text-sm transition-colors"
                >
                  Reenviar código
                </button>
              </form>
            </>
          )}

          {paso === 'formulario' && (
            <p className="text-center text-sm text-slate-500 mt-6">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Inicia sesión
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
