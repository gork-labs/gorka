import { SubagentLoader } from './dist/subagents/loader.js';
import { config } from './dist/utils/config.js';

// Set environment variable to point to the correct subagents directory
process.env.SECONDBRAIN_SUBAGENTS_PATH = './subagents';

async function testLoader() {
  console.log('Testing SubagentLoader...');
  console.log('Environment variable set to:', process.env.SECONDBRAIN_SUBAGENTS_PATH);
  console.log('Config subagents path:', config.subagentsPath);

  const loader = new SubagentLoader();

  try {
    await loader.initialize();
    console.log('✅ Loader initialized successfully');

    const subagents = loader.listSubagents();
    console.log('Available subagents:', subagents);

    if (subagents.includes('Security Engineer')) {
      const securityEngineer = loader.getSubagent('Security Engineer');
      console.log('Security Engineer subagent loaded:');
      console.log('- Name:', securityEngineer.name);
      console.log('- Description:', securityEngineer.description);
      console.log('- Content length:', securityEngineer.content.length);

      // Check if enhanced workflows are present
      const hasEnhancedWorkflow = securityEngineer.content.includes('🚨 MANDATORY SECURITY ANALYSIS WORKFLOW');
      const hasEvidenceRequirements = securityEngineer.content.includes('Evidence-Based Analysis');
      const hasHonestyRequirements = securityEngineer.content.includes('Honesty Requirements');

      console.log('Enhanced features present:');
      console.log('- Mandatory workflow:', hasEnhancedWorkflow);
      console.log('- Evidence requirements:', hasEvidenceRequirements);
      console.log('- Honesty requirements:', hasHonestyRequirements);

      // Show first 500 chars to verify content
      console.log('Content preview:');
      console.log(securityEngineer.content.substring(0, 500) + '...');

    } else {
      console.log('❌ Security Engineer subagent not found');
    }

  } catch (error) {
    console.error('❌ Loader test failed:', error);
  }
}

testLoader();
