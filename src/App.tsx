import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Download, Home, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Input } from './components/ui/Input';
import { SectionTitle } from './components/ui/SectionTitle';
import { submitRegistration } from './services/registrationClient';

const residentSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome obrigatório')
    .refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, 'Insira nome e sobrenome'),
  email: z.string().trim().email('E-mail inválido'),
});

const formSchema = z.object({
  hasApp: z.enum(['yes', 'no']),
  houseNumber: z.string().refine((value) => /^\d+$/.test(value), {
    message: 'Número da casa obrigatório e deve conter apenas números',
  }),
  residents: z
    .array(residentSchema)
    .min(1)
    .superRefine((residents, ctx) => {
      const seenEmails = new Map<string, number>();
      const seenNames = new Map<string, number>();

      residents.forEach((resident, index) => {
        const normalizedEmail = resident.email.trim().toLowerCase();
        const normalizedName = resident.name.trim().toLowerCase().replace(/\s+/g, ' ');

        if (seenEmails.has(normalizedEmail)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'E-mail repetido entre moradores.',
            path: ['residents', index, 'email'],
          });
        } else {
          seenEmails.set(normalizedEmail, index);
        }

        if (seenNames.has(normalizedName)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Nome repetido entre moradores.',
            path: ['residents', index, 'name'],
          });
        } else {
          seenNames.set(normalizedName, index);
        }
      });
    }),
});

type FormValues = z.infer<typeof formSchema>;

type SubmitState = 'idle' | 'loading';

type PageState = 'welcome' | 'form' | 'success';

const appLogo = 'https://www.construtoraelecon.com.br/wp-content/uploads/2022/08/villagio-di-lux-2.jpg';

const App = () => {
  const [page, setPage] = useState<PageState>('welcome');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hasApp: 'no',
      houseNumber: '',
      residents: [{ name: '', email: '' }],
    },
  });

  const hasApp = watch('hasApp');

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'residents',
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setSubmitState('loading');

    try {
      await submitRegistration({
        houseNumber: values.houseNumber.trim(),
        residents: values.residents.map((resident) => ({
          name: resident.name.trim(),
          email: resident.email.trim(),
        })),
      });

      setPage('success');
      setSubmitState('idle');
    } catch (error) {
      setSubmitState('idle');
      setSubmitError(error instanceof Error ? error.message : 'Erro ao enviar cadastro.');
    }
  };

  const handleReset = () => {
    reset({ hasApp: 'no', houseNumber: '', residents: [{ name: '', email: '' }] });
    setSubmitError(null);
    setSubmitState('idle');
    setPage('welcome');
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <main className="grid gap-6">
          {page === 'welcome' ? (
            <Card className="space-y-6 p-8 text-center">
              <img src={appLogo} alt="Villagio Di Lux" className="mx-auto h-20 w-20 rounded-3xl object-cover shadow-sm" />
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold text-slate-950">Portal Villagio Di Lux</h2>
                <p className="mx-auto max-w-xl text-sm leading-6 text-slate-600">
                  Cadastro para acesso à automação do portão
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left shadow-sm">
                  <p className="text-sm font-semibold text-slate-950">Passo 1</p>
                  <p className="mt-2 text-sm text-slate-600">Instale o aplicativo Tuya Smart e realize seu cadastro.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left shadow-sm">
                  <p className="text-sm font-semibold text-slate-950">Passo 2</p>
                  <p className="mt-2 text-sm text-slate-600">Informe o número da casa e os moradores que deverão receber acesso ao dispositivo.</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col items-center gap-3">
                <a
                  href="https://youtube.com/shorts/NxuZkW5HE0A?feature=shared"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm text-emerald-600 underline"
                >
                  Ver vídeo de instruções
                </a>
                <Button onClick={() => setPage('form')} className="mx-auto px-10 py-3">
                  Entrar
                </Button>
              </div>
            </Card>
          ) : page === 'success' ? (
            <Card className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-soft">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-950">
                <strong>Solicitação enviada com sucesso!</strong>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Em breve, os acessos solicitados serão liberados.
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Enquanto isso, aproveite para assistir ao vídeo de instruções abaixo.
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                <strong>Não se esqueça de ativar o som.</strong>
              </p>

              <div className="mx-auto mt-6 w-full max-w-2xl">
                <div className="relative" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src="https://www.youtube.com/embed/NxuZkW5HE0A"
                    title="Instruções Villagio Di Lux"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute left-0 top-0 h-full w-full rounded-lg"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-center gap-4">
                <a
                  href="https://youtube.com/shorts/NxuZkW5HE0A?feature=shared"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Abrir no celular
                </a>
              </div>

              <Button onClick={handleReset} className="mt-6">
                Fechar
              </Button>
            </Card>
          ) : (
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Card className="space-y-6 p-8">
              <div className="flex items-center gap-3 text-slate-950">
                <Home className="h-5 w-5" />
                <span className="text-lg font-semibold">Villagio Di Lux</span>
              </div>
              <SectionTitle
                title="Você já baixou o Tuya Smart?"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { value: 'yes', label: 'Sim' },
                    { value: 'no', label: 'Não' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center justify-between rounded-3xl border px-5 py-4 transition ${
                        hasApp === option.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      <div className={`h-5 w-5 rounded-full border transition ${
                        hasApp === option.value ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                      }`} />
                      <input
                        type="radio"
                        value={option.value}
                        {...register('hasApp')}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>
              </Card>

              {hasApp === 'no' && (
                <Card className="space-y-6 p-8">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-950">Antes de continuar...</h2>
                    <p className="text-sm leading-6 text-slate-600">
                      Baixe o aplicativo Tuya Smart, realize seu cadastro e retorne para preencher este formulário.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <a
                      href="https://apps.apple.com/br/app/tuya-smart-life-smart-living/id1034649547"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition duration-200 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" /> Baixar para iPhone
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.tuya.smart&pcampaignid=web_share"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition duration-200 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" /> Baixar para Android
                    </a>
                  </div>
                </Card>
              )}

              {hasApp === 'yes' && (
                <Card className="space-y-6 p-8">
                  <div className="grid gap-4">
                    <div className="grid gap-3">
                      <Input
                        label="Número da Casa"
                        placeholder="Exemplo: 12"
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        aria-invalid={!!errors.houseNumber}
                        autoComplete="off"
                        {...register('houseNumber')}
                        error={errors.houseNumber?.message?.toString()}
                      />
                    </div>

                    <div className="space-y-4 rounded-[32px] border border-slate-200 bg-slate-50 p-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-slate-950">Moradores</h3>
                        <p className="text-sm text-slate-600">Adicione todos os moradores que utilizarão o aplicativo.</p>
                      </div>

                      <div className="space-y-5">
                        {fields.map((field, index) => (
                          <div key={field.id} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
                            <div className="grid gap-4">
                              <Input
                                label="Nome Completo"
                                placeholder="Nome completo"
                                autoComplete="name"
                                aria-invalid={!!errors.residents?.[index]?.name}
                                {...register(`residents.${index}.name` as const)}
                                error={errors.residents?.[index]?.name?.message?.toString()}
                              />
                              <Input
                                label="E-mail"
                                placeholder="seu@email.com"
                                type="email"
                                autoComplete="email"
                                aria-invalid={!!errors.residents?.[index]?.email}
                                {...register(`residents.${index}.email` as const)}
                                error={errors.residents?.[index]?.email?.message?.toString()}
                              />
                            </div>

                            <div className="flex items-start justify-end">
                              <button
                                type="button"
                                disabled={fields.length === 1}
                                onClick={() => remove(index)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Remover morador"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => append({ name: '', email: '' })}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <Plus className="mr-2 h-4 w-4" /> Adicionar morador
                        </button>
                      </div>
                    </div>

                    {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-slate-600">
                        Todos os campos são obrigatórios e devem ser preenchidos corretamente.
                      </div>
                      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting ? 'Enviando...' : 'Enviar Cadastro'}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </form>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
