/**
 * スキル名の正規化マップ
 * キー: 正規化後の標準名、値: 正規化前のバリエーション
 */
const SKILL_NORMALIZATION_MAP: Record<string, string[]> = {
  // プログラミング言語
  '.NET': ['.Net'],
  'C#.NET': ['C#.net'],
  'VB.NET': ['VB.net'],
  'ASP.NET': ['ASP.Net'],

  // クラウド・インフラ
  'AWS': ['AWSWAF'],
  'CI/CD': ['CICD'],
  'Active Directory': ['ActiveDirectory'],

  // データベース
  'MySQL': ['My SQL'],
  'PostgreSQL': ['Postgre SQL', 'Postgres', 'PostgresSQL'],
  'SQL Server': ['SQLSerer', 'SQLServer'],
  'Oracle DB': ['OracleDB', 'Oracle DataBase'],
  'PL/SQL': ['PL-SQL'],

  // フレームワーク・ライブラリ
  'CakePHP': ['Cake PHP'],
  'CodeIgniter': ['Codeigniter'],
  'Spring Boot': ['Spring boot', 'SpringBoot', 'Springboot'],
  'Next.js': ['Next', 'NextJS'],
  'Nest.js': ['NestJS'],
  'React Native': ['ReactNative', 'Reactnative'],

  // ツール
  'GitHub': ['Github', 'github'],
  'GitHub Actions': ['Github Actions'],
  'GitLab': ['Gitlab'],
  'Git': ['git'],
  'Backlog': ['backlog'],
  'Confluence': ['confluence'],
  'Miro': ['miro'],
  'VS Code': ['VSCode'],
  'Visual Studio': ['VisualStudio'],
  'Android Studio': ['AndroidStudio'],
  'Excel VBA': ['ExcelVBA'],
  'Playwright': ['playwright'],

  // エフェクト・デザイン
  'After Effects': ['After effect', 'AfterEffects'],
  'Premiere Pro': ['Premiere', 'PremierePro', 'PremierPro'],
  'DreamWeaver': ['Dreamweaver'],

  // インフラ・ネットワーク
  'VMware': ['VMWare', 'Vmware'],
  'Windows Server': ['WindowsServer', 'Windowsサーバ', 'Windowsサーバー'],
  'Windows OS': ['WindowsOS'],
  'Linux': ['linux'],
  'UNIX': ['Unix'],
  'AIX': ['Aix'],
  'RedHat': ['Redhat'],
  'Nginx': ['nginx'],

  // セキュリティ
  'Palo Alto': ['PaloAlto', 'Paloalto', 'PaloAltoNetworks'],
  'Prisma Access': ['PrismaAccess'],
  'Entra ID': ['EntraID', 'Active Directory/Entra ID'],

  // AWS サービス
  'AWS Lambda': ['Lambda'],
  'AWS S3': ['S3'],
  'AWS RDS': ['RDS', 'Amazon RDS'],
  'AWS CloudWatch': ['CloudWatch'],
  'AWS WAF': ['AWSWAF'],
  'Route 53': ['Route53'],
  'Step Functions': ['StepFunctions'],

  // GCP
  'Google Cloud': ['GoogleCloud', 'GCP'],

  // Microsoft
  'Microsoft 365': ['Microsoft365', 'M365'],
  'Power BI': ['PowerBI'],
  'SharePoint': ['Sharepoint'],

  // その他
  'JavaScript': ['Javascript', 'JS'],
  'TypeScript': ['Typescript'],
  'Scala': ['scala'],
  'Java': ['JAVA', 'java'],
  'SCSS': ['scss'],
  'HTML/CSS': ['HTML', 'CSS', 'HTML5', 'CSS3'],
  'WordPress': ['Wordpress'],
  'Salesforce': ['SalesForce'],
  'Tableau': ['tableau'],
  'Terraform': ['terraform'],
  'Docker': ['docker'],
  'Kubernetes': ['K8s'],
  'SageMaker': ['Sagemaker'],
  'Splunk': ['SPLUNK'],
  'Zabbix': ['ZABBIX'],
  'Jenkins': ['JENKINS'],
  'Jira': ['JIRA'],
  'JUnit': ['Junit'],
  'Shell Script': ['ShellScript', 'Shellscript', 'SHELL', 'Shell', 'Shellスクリプト', 'シェルスクリプト'],
  'REST API': ['RestAPI', 'RESTful API'],
  'Web': ['WEB', 'Webシステム', 'Webアプリケーション'],
  'Webディレクション': ['webディレクション'],
  'Windows': ['windows'],
  'Spring': ['spring'],
  'AJAX': ['Ajax'],
  'NET-COBOL': ['NetCOBOL'],
  'HULFT': ['Hulft'],
  'Intra-mart': ['Intramart', 'intra-mart'],
};

/**
 * 逆引きマップを生成（バリエーション → 標準名）
 */
const REVERSE_MAP: Record<string, string> = {};
Object.entries(SKILL_NORMALIZATION_MAP).forEach(([standard, variants]) => {
  variants.forEach(variant => {
    REVERSE_MAP[variant] = standard;
  });
});

/**
 * スキル名を正規化する
 * @param skillName - 正規化前のスキル名
 * @returns 正規化後のスキル名
 */
export function normalizeSkillName(skillName: string): string {
  const trimmed = skillName.trim();

  // 逆引きマップに存在する場合は標準名を返す
  if (REVERSE_MAP[trimmed]) {
    return REVERSE_MAP[trimmed];
  }

  // 標準名そのものの場合はそのまま返す
  return trimmed;
}

/**
 * 複数のスキル名を正規化する
 * @param skillNames - 正規化前のスキル名の配列
 * @returns 正規化後のスキル名の配列（重複排除済み）
 */
export function normalizeSkillNames(skillNames: string[]): string[] {
  const normalized = skillNames.map(normalizeSkillName);
  return Array.from(new Set(normalized)); // 重複排除
}
