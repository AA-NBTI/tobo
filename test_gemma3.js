const raw = `*   Input: "Return the following JSON exactly: {\\"displayName\\": \\"Test-Test\\"}"
    *   Desired Output: \`{\\"displayName\\": \\"Test-Test\\"}\`

    *   The user wants a specific JSON object.
    *   The user specified "exactly".

    *   JSON string: \`{\\"displayName\\": \\"Test-Test\\"}\`

    *   Just return the JSON.

    \`{\\"displayName\\": \\"Test-Test\\"}\`{\\"displayName\\": \\"Test-Test\\"}`;

let cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
if (jsonMatch) cleaned = jsonMatch[0];

cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

try {
  const parsed = JSON.parse(cleaned);
  console.log('Parsed successfully:', parsed);
} catch (e) {
  console.error('JSON Parse Error:', e.message);
  console.log('Failing String was:', cleaned);
}
