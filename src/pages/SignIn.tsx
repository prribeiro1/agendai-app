import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type SignInForm = {
  phone: string;
  password: string;
};

export default function SignIn() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignInForm>();
  const navigate = useNavigate();

  const onSubmit = async (data: SignInForm) => {
    const { phone, password } = data;
    const syntheticEmail = `${phone.replace(/\D/g, '')}@agendai.app`;

    const { error } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    if (error) {
      alert('Erro ao logar: ' + error.message);
      return;
    }

    alert('Login realizado com sucesso!');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded bg-white p-6 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-blue-600">Entrar</h2>
        <div className="mb-4">
          <label className="mb-1 block text-gray-700">Telefone (WhatsApp)</label>
          <input
            type="tel"
            {...register('phone', {
              required: 'Telefone é obrigatório',
              pattern: { value: /^\d{10,11}$/, message: 'Telefone inválido (10 ou 11 dígitos)' }
            })}
            className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          />
          {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-gray-700">Senha</label>
          <input
            type="password"
            {...register('password', { required: 'Senha é obrigatória' })}
            className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          className="w-full rounded bg-blue-500 p-2 text-white hover:bg-blue-600"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}