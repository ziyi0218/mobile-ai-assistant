import { useColorScheme } from 'react-native';
import { useResolvedTheme } from '../../utils/theme';

const mockUseColorScheme = useColorScheme as jest.Mock;

describe('useResolvedTheme', () => {
  it('systeme + dark system → dark theme', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { resolved, colors } = useResolvedTheme('systeme');
    expect(resolved).toBe('dark');
    expect(colors.bg).toBe('#0B0B0F');
  });

  it('systeme + light system → light theme', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { resolved, colors } = useResolvedTheme('systeme');
    expect(resolved).toBe('light');
    expect(colors.bg).toBe('#F6F6F6');
  });

  it('systeme + null system → light theme (fallback)', () => {
    mockUseColorScheme.mockReturnValue(null);
    const { resolved } = useResolvedTheme('systeme');
    expect(resolved).toBe('light');
  });

  it('sombre → dark theme regardless of system', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { resolved, colors } = useResolvedTheme('sombre');
    expect(resolved).toBe('dark');
    expect(colors.card).toBe('#15151C');
  });

  it('clair → light theme regardless of system', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { resolved, colors } = useResolvedTheme('clair');
    expect(resolved).toBe('light');
    expect(colors.card).toBe('#FFFFFF');
  });

  it('returns correct dark color palette', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { colors } = useResolvedTheme('systeme');
    expect(colors).toEqual({
      bg: '#0B0B0F',
      card: '#15151C',
      text: '#FFFFFF',
      subtext: '#A0A0AA',
      border: '#262633',
      accent: 'blue',
      subaccent: 'deepskyblue',
    });
  });

  it('returns correct light color palette', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { colors } = useResolvedTheme('systeme');
    expect(colors).toEqual({
      bg: '#F6F6F6',
      card: '#FFFFFF',
      text: '#111111',
      subtext: '#777777',
      border: '#E6E6E6',
      accent: 'blue',
      subaccent: 'deepskyblue',
    });
  });
});
