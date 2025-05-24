import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type SignUpForm = {
  name: string;
  phone: string;
  password: string;
};

export default function SignUp() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignUpForm>();
  const navigate = useNavigate();

  const onSubmit = async (data: SignUpForm) => {
    const { name, phone, password } = data;

    // Cria um e-mail sintético com base no telefone
    const syntheticEmail = `${phone.replace(/\D/g, '')}@agendai.app`;

    // Cadastra o usuário no Supabase com metadados
    const { data: authData, error } = await supabase.auth.signUp({
      email: syntheticEmail,
      password,
      options: {
        data: { name, phone } // Metadados salvos no user_metadata
      }
    });

    if (error) {
      alert('Erro ao cadastrar: ' + error.message);
      return;
    }

    // Salva os dados do perfil na tabela profiles
    const { error: profileError } = await supabase.from('profiles').insert([
      { id: authData.user.id, name, phone }
    ]);

    if (profileError) {
      alert('Erro ao salvar perfil: ' + profileError.message);
      return;
    }

    alert('Cadastro realizado com sucesso!');
    navigate('/sign-in');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded bg-white p-6 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-blue-600">Criar Conta</h2>
        <div className="mb-4">
          <label className="mb-1 block text-gray-700">Nome</label>
          <input
            type="text"
            {...register('name', { required: 'Nome é obrigatório' })}
            className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
        </div>
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
            {...register('password', {
              required: 'Senha é obrigatória',
              minLength: { value: 6, message: 'Mínimo 6 caracteres' }
            })}
            className="w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          className="w-full rounded bg-blue-500 p-2 text-white hover:bg-blue-600"
        >
          Cadastrar
        </button>
      </form>
    </div>
  );
}