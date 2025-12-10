import { CategoryData } from './types';

export const CATEGORIES: CategoryData[] = [
  {
    id: 'legislacao',
    title: '1. Legislação e Conformidades',
    questions: [
      { id: '1_1', text: 'Existe legislação municipal específica (Código/Lei Ambiental Municipal) vigente?', category: 'legislacao' },
      { id: '1_2', text: 'Há decretos/portarias que regulamentam o Plano Municipal de Saneamento (PMSB) e o PMGIRS?', category: 'legislacao' },
      { id: '1_3', text: 'O município cumpre a PNRS (Lei 12.305) e normas correlatas aplicáveis?', category: 'legislacao' },
      { id: '1_4', text: 'Existe matriz de conformidade ambiental com obrigações, responsáveis e prazos?', category: 'legislacao' },
      { id: '1_5', text: 'As exigências ambientais estão integradas ao PPA/LDO/LOA?', category: 'legislacao' },
      { id: '1_6', text: 'Relatórios de conformidade, autos de infração e sanções são publicados periodicamente?', category: 'legislacao' },
      { id: '1_7', text: 'Há agenda oficial para atualização/modernização do marco regulatório ambiental (24 meses)?', category: 'legislacao' },
      { id: '1_8', text: 'Prevê adesão/fortalecimento de consórcios intermunicipais para regulação e fiscalização?', category: 'legislacao' },
    ]
  },
  {
    id: 'agua',
    title: '2. Água e Saneamento',
    questions: [
      { id: '2_1', text: 'O município possui Plano Municipal de Saneamento Básico vigente (água, esgoto, drenagem e resíduos)?', category: 'agua' },
      { id: '2_2', text: 'Qual o % da população com acesso à água potável? (Considerar SIM se > 90%)', category: 'agua' },
      { id: '2_3', text: 'Qual o % da população com coleta e tratamento de esgoto? (Considerar SIM se > 80%)', category: 'agua' },
      { id: '2_4', text: 'Existe Plano de Drenagem Urbana com mapeamento de áreas de risco?', category: 'agua' },
      { id: '2_5', text: 'O PMSB está atualizado com metas até 2033 e indicadores de monitoramento?', category: 'agua' },
      { id: '2_6', text: 'Há programas de uso racional da água em prédios públicos (medição, metas, retrofit)?', category: 'agua' },
      { id: '2_7', text: 'Existem contratos/regulação (ARSE/AGEPAN/ARSAE ou congênere) com metas de desempenho?', category: 'agua' },
      { id: '2_8', text: 'Prevê PPPs/Consórcios/Captação de recursos para universalização?', category: 'agua' },
      { id: '2_9', text: 'Prevê ampliação de Soluções Baseadas na Natureza para drenagem e qualidade hídrica?', category: 'agua' },
    ]
  },
  {
    id: 'residuos',
    title: '3. Resíduos Sólidos - PNRS',
    questions: [
      { id: '3_1', text: 'Existe PMGIRS vigente e publicado?', category: 'residuos' },
      { id: '3_2', text: 'Há coleta seletiva implantada (parcial/total) com cobertura definida?', category: 'residuos' },
      { id: '3_3', text: 'Existem cooperativas/associações de catadores formalizadas e integradas à cadeia?', category: 'residuos' },
      { id: '3_4', text: 'A destinação final é realizada em aterro sanitário licenciado (sem lixão)?', category: 'residuos' },
      { id: '3_5', text: 'Há monitoramento da taxa de reciclagem e cobertura da coleta seletiva?', category: 'residuos' },
      { id: '3_6', text: 'Há acordos/setores com logística reversa (embalagens, eletroeletrônicos, pneus, óleo)?', category: 'residuos' },
      { id: '3_7', text: 'Existe sistema de PEVs (Pontos de Entrega Voluntária) operando?', category: 'residuos' },
      { id: '3_8', text: 'Prevê expansão da coleta seletiva por bairros e contratos com metas para cooperativas?', category: 'residuos' },
      { id: '3_9', text: 'Prevê campanhas permanentes de educação ambiental e compras públicas com conteúdo reciclado?', category: 'residuos' },
      { id: '3_10', text: 'O município incentiva políticas de produção mais limpa (E3P) junto a empresas e órgãos públicos?', category: 'residuos' },
      { id: '3_11', text: 'Há programas de educação para consumo consciente e redução na geração de resíduos?', category: 'residuos' },
      { id: '3_12', text: 'Existem editais de inovação ou programas municipais voltados à A3P?', category: 'residuos' },
    ]
  },
  {
    id: 'energia',
    title: '4. Energia e Clima',
    questions: [
      { id: '4_1', text: 'Existe inventário municipal de emissões de GEE (baseline e setores)?', category: 'energia' },
      { id: '4_2', text: 'Há projetos de eficiência energética (ex.: LED na iluminação pública/prédios)?', category: 'energia' },
      { id: '4_3', text: 'O município monitora o % de energia elétrica renovável utilizada em prédios públicos?', category: 'energia' },
      { id: '4_4', text: 'Existe plano/estratégia de adaptação climática (ondas de calor, enchentes, deslizamentos)?', category: 'energia' },
      { id: '4_5', text: 'Há geração distribuída (Solar FV) em equipamentos públicos em operação?', category: 'energia' },
      { id: '4_6', text: 'Prevê expansão de GD Fotovoltaica (PPP/Consórcios) e contratação com desempenho energético?', category: 'energia' },
      { id: '4_7', text: 'Prevê atualização quinquenal do inventário de GEE com relatório público de progresso?', category: 'energia' },
      { id: '4_8', text: 'O município prevê integrar riscos climáticos e ambientais ao orçamento municipal (PPA, LDO, LOA)?', category: 'energia' },
    ]
  },
  {
    id: 'biodiversidade',
    title: '5. Biodiversidade e Áreas Verdes',
    questions: [
      { id: '5_1', text: 'O município possui praças, parques ou Unidades de Conservação instituídas por lei?', category: 'biodiversidade' },
      { id: '5_2', text: 'Existe programa de arborização urbana com metas anuais?', category: 'biodiversidade' },
      { id: '5_3', text: 'As UCs possuem plano de manejo implementado e conselho gestor ativo?', category: 'biodiversidade' },
      { id: '5_4', text: 'Há inventário de áreas verdes/habitante e monitoramento de cobertura vegetal?', category: 'biodiversidade' },
      { id: '5_5', text: 'Prevê criação de corredores ecológicos urbanos e recuperação de áreas degradadas?', category: 'biodiversidade' },
      { id: '5_6', text: 'Prevê ampliar áreas verdes por habitante com metas por bairro?', category: 'biodiversidade' },
      { id: '5_7', text: 'O município possui inventário de biodiversidade urbana (fauna/flora) atualizado?', category: 'biodiversidade' },
      { id: '5_8', text: 'Há programa de proteção de fauna/flora em áreas urbanas e periurbanas?', category: 'biodiversidade' },
      { id: '5_9', text: 'Indicadores de biodiversidade são monitorados e publicados?', category: 'biodiversidade' },
    ]
  },
  {
    id: 'riscos',
    title: '6. Riscos e Defesa Civil',
    questions: [
      { id: '6_1', text: 'Existe mapeamento de áreas de risco (enchentes, deslizamentos, secas)?', category: 'riscos' },
      { id: '6_2', text: 'Há plano de contingência da defesa civil municipal vigente?', category: 'riscos' },
      { id: '6_3', text: 'Tempo médio de resposta a eventos críticos é monitorado e publicado?', category: 'riscos' },
      { id: '6_4', text: 'Há obras e soluções baseadas na natureza previstas para macrodrenagem?', category: 'riscos' },
      { id: '6_5', text: 'Prevê implantação de sistema de alerta precoce e centro de monitoramento?', category: 'riscos' },
      { id: '6_6', text: 'Prevê atualização anual do plano de contingência com simulações e exercícios?', category: 'riscos' },
    ]
  },
  {
    id: 'ar_ruido',
    title: '7. Qualidade do Ar e Ruído',
    questions: [
      { id: '7_1', text: 'O município possui monitoramento sistemático da qualidade do ar?', category: 'ar_ruido' },
      { id: '7_2', text: 'Existe legislação e fiscalização de poluição sonora?', category: 'ar_ruido' },
      { id: '7_3', text: 'Relatórios de qualidade do ar são publicados periodicamente?', category: 'ar_ruido' },
      { id: '7_4', text: 'Há indicadores de ruído urbano por regiões/bairros?', category: 'ar_ruido' },
      { id: '7_5', text: 'Prevê rede de sensores digitais e painéis públicos para ar e ruído?', category: 'ar_ruido' },
    ]
  },
  {
    id: 'vida_agua',
    title: '8. Vida na Água',
    questions: [
      { id: '8_1', text: 'O município possui cadastro e mapeamento de rios, lagos, córregos, nascentes urbanas?', category: 'vida_agua' },
      { id: '8_2', text: 'Existe legislação municipal específica para proteção de recursos hídricos superficiais?', category: 'vida_agua' },
      { id: '8_3', text: 'Há programa de monitoramento da qualidade da água em corpos d’água urbanos?', category: 'vida_agua' },
      { id: '8_4', text: 'Existem ações de recuperação de margens, matas ciliares e APPs degradadas?', category: 'vida_agua' },
      { id: '8_5', text: 'O município possui programa de controle de lançamento de efluentes domésticos/industriais?', category: 'vida_agua' },
      { id: '8_6', text: 'São realizadas campanhas educativas sobre proteção de rios e lagos urbanos?', category: 'vida_agua' },
      { id: '8_7', text: 'O município prevê planos de revitalização de rios urbanos nos próximos anos?', category: 'vida_agua' },
      { id: '8_8', text: 'Há previsão de PPP ou convênios para conservação de corpos hídricos?', category: 'vida_agua' },
      { id: '8_9', text: 'Pretende criar indicadores de monitoramento contínuo da qualidade da água?', category: 'vida_agua' },
    ]
  },
  {
    id: 'educacao',
    title: '9. Educação Ambiental',
    questions: [
      { id: '9_1', text: 'Existe programa municipal contínuo de Educação Ambiental (EA)?', category: 'educacao' },
      { id: '9_2', text: 'As escolas municipais desenvolvem conteúdos/ações de EA?', category: 'educacao' },
      { id: '9_3', text: 'Há plano anual de EA com metas, públicos e avaliação de impacto?', category: 'educacao' },
      { id: '9_4', text: 'Existem parcerias com universidades/ONGs para EA comunitária?', category: 'educacao' },
      { id: '9_5', text: 'Prevê institucionalizar a EA como política transversal com orçamento próprio?', category: 'educacao' },
      { id: '9_6', text: 'Prevê integrar a educação ambiental ao currículo de todas as escolas?', category: 'educacao' },
    ]
  },
  {
    id: 'governanca',
    title: '10. Gestão e Governança ESG',
    questions: [
      { id: '10_1', text: 'Existe responsável técnico designado para ESG na secretaria?', category: 'governanca' },
      { id: '10_2', text: 'A secretaria possui planos, políticas ou regulamentos relacionados ao ESG?', category: 'governanca' },
      { id: '10_3', text: 'A secretaria participa de comitê ou grupo de trabalho ESG municipal?', category: 'governanca' },
      { id: '10_4', text: 'As ações e indicadores da secretaria estão integrados ao PPA, LDO e LOA?', category: 'governanca' },
      { id: '10_5', text: 'As informações da secretaria são publicadas no portal da transparência?', category: 'governanca' },
      { id: '10_6', text: 'Indicadores setoriais são monitorados e divulgados?', category: 'governanca' },
      { id: '10_7', text: 'Dados são publicados em formato aberto (CSV/JSON) com dicionário de dados?', category: 'governanca' },
      { id: '10_8', text: 'A secretaria possui recursos orçamentários vinculados a ações ESG?', category: 'governanca' },
      { id: '10_9', text: 'Existem fontes de financiamento externo (fundos, convênios, parcerias)?', category: 'governanca' },
      { id: '10_10', text: 'Servidores participaram de capacitação em ESG, ODS ou sustentabilidade?', category: 'governanca' },
      { id: '10_11', text: 'Há sistema de monitoramento e avaliação dos indicadores ESG da secretaria?', category: 'governanca' },
      { id: '10_12', text: 'Existem metas de curto e médio prazo vinculadas ao ESG?', category: 'governanca' },
      { id: '10_13', text: 'As ações da secretaria estão vinculadas a ODS específicos?', category: 'governanca' },
      { id: '10_14', text: 'A secretaria promove campanhas educativas e de engajamento relacionadas ao ESG?', category: 'governanca' },
    ]
  }
];