import fs from 'fs';
import path from 'path';

export type Framework = 'REACT_STATIC' | 'NEXTJS' | 'EXPRESS' | 'DJANGO';

export function detectFramework(outdir: string): Framework {
  const packageJsonPath = path.join(outdir, 'package.json');
  const requirementsTxtPath = path.join(outdir, 'requirements.txt');
  const managePyPath = path.join(outdir, 'manage.py');

  if (fs.existsSync(requirementsTxtPath) || fs.existsSync(managePyPath)) {
    return 'DJANGO';
  }

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies['next']) {
      return 'NEXTJS';
    } else if (dependencies['express']) {
      return 'EXPRESS';
    } else {
      return 'REACT_STATIC';
    }
  }

  return 'REACT_STATIC';
}
