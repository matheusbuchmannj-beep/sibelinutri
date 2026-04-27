# Configuração do Backend (Google Sheets + Google Calendar)

Como este sistema utiliza exclusivamente o ecossistema Google, você precisa configurar sua planilha e obter as credenciais.

## 1. Google Sheets (Banco de Dados)

Crie uma nova planilha no Google Sheets e crie as seguintes abas (e cabeçalhos):

### Aba: `Config`
| Chave | Valor |
| :--- | :--- |
| brandName | Sibeli Farias |
| heroTitle | Nutrição que transforma |
| heroSubtitle | Sua melhor versão começa aqui |
| heroButtonText | Agendar Consulta |
| whatsappNumber | 5547984778043 |
| whatsappMessage | Olá! Vi seu site e gostaria de agendar uma consulta para {data} às {hora}. |
| pixKey | sua-chave-pix |
| bgUrl | /fundo.png |
| personUrl | /pessoa.png |
| elementsUrl | /elementos.png |
| primaryColor | #869471 |
| address | Tubarão - SC |

### Aba: `Locais`
| ID | Nome | Endereço | Link Google Maps |
| :--- | :--- | :--- | :--- |
| 1 | Clínica Centro | Rua Exemplo, 123 | https://maps... |

### Aba: `Horarios`
| Data | Slots |
| :--- | :--- |
| 2024-04-25 | 08:00, 09:00, 14:00 |

### Aba: `Agendamentos`
| Paciente | WhatsApp | Data | Hora | Tipo | LocalID | Status | CriadoEm |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

## 2. Google Cloud Console (Autenticação)

1. Vá ao [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto.
3. Ative as APIs: **Google Sheets API** e **Google Calendar API**.
4. Configure a **Tela de Consentimento OAuth** como "Externo".
   - Adicione os escopos: `.../auth/spreadsheets` e `.../auth/calendar.events`.
5. Em **Credenciais**, crie um **ID do cliente OAuth** (Aplicação Web).
   - Adicione `https://ais-dev-fxecjoiwfk5oykf5zai5do-178089899758.us-east1.run.app` (e o domínio final) aos **Origens JavaScript autorizadas**.
6. Copie o **Client ID** e coloque no seu arquivo `.env` como `VITE_GOOGLE_CLIENT_ID`.

## 3. ID da Planilha

O ID da planilha está na URL: `https://docs.google.com/spreadsheets/d/SEU_ID_AQUI/edit`
Coloque no seu arquivo `.env` como `VITE_GOOGLE_SHEET_ID`.
