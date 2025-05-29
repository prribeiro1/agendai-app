
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Scissors, 
  TrendingUp,
  FileText,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportsManagerProps {
  barbershopId: string;
}

interface ServiceReport {
  service_name: string;
  count: number;
  revenue: number;
}

interface BarberReport {
  barber_name: string;
  appointments: number;
  revenue: number;
}

interface DailyReport {
  date: string;
  appointments: number;
  revenue: number;
}

interface MonthlyStats {
  totalAppointments: number;
  totalRevenue: number;
  averageTicket: number;
  topService: string;
  topBarber: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const ReportsManager: React.FC<ReportsManagerProps> = ({ barbershopId }) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('current-month');
  const [serviceData, setServiceData] = useState<ServiceReport[]>([]);
  const [barberData, setBarberData] = useState<BarberReport[]>([]);
  const [dailyData, setDailyData] = useState<DailyReport[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalAppointments: 0,
    totalRevenue: 0,
    averageTicket: 0,
    topService: '',
    topBarber: ''
  });

  useEffect(() => {
    if (barbershopId) {
      loadReports();
    }
  }, [barbershopId, period]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last-7-days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last-30-days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      
      console.log('Carregando relatórios para o período:', { startDate, endDate });

      // Buscar agendamentos do período com joins
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services (id, name, price),
          barbers (id, name)
        `)
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .neq('status', 'cancelado');

      if (error) {
        console.error('Erro ao carregar agendamentos:', error);
        toast.error('Erro ao carregar dados dos relatórios');
        return;
      }

      console.log('Agendamentos carregados:', appointments);

      // Processar dados para relatórios
      processServiceData(appointments || []);
      processBarberData(appointments || []);
      processDailyData(appointments || []);
      processMonthlyStats(appointments || []);

    } catch (error) {
      console.error('Erro inesperado ao carregar relatórios:', error);
      toast.error('Erro inesperado ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const processServiceData = (appointments: any[]) => {
    const serviceMap = new Map<string, { count: number; revenue: number }>();

    appointments.forEach(appointment => {
      if (appointment.services) {
        const serviceName = appointment.services.name;
        const price = appointment.services.price;

        if (serviceMap.has(serviceName)) {
          const current = serviceMap.get(serviceName)!;
          serviceMap.set(serviceName, {
            count: current.count + 1,
            revenue: current.revenue + price
          });
        } else {
          serviceMap.set(serviceName, { count: 1, revenue: price });
        }
      }
    });

    const data = Array.from(serviceMap.entries()).map(([service_name, data]) => ({
      service_name,
      count: data.count,
      revenue: data.revenue
    }));

    setServiceData(data.sort((a, b) => b.count - a.count));
  };

  const processBarberData = (appointments: any[]) => {
    const barberMap = new Map<string, { appointments: number; revenue: number }>();

    appointments.forEach(appointment => {
      if (appointment.barbers && appointment.services) {
        const barberName = appointment.barbers.name;
        const price = appointment.services.price;

        if (barberMap.has(barberName)) {
          const current = barberMap.get(barberName)!;
          barberMap.set(barberName, {
            appointments: current.appointments + 1,
            revenue: current.revenue + price
          });
        } else {
          barberMap.set(barberName, { appointments: 1, revenue: price });
        }
      }
    });

    const data = Array.from(barberMap.entries()).map(([barber_name, data]) => ({
      barber_name,
      appointments: data.appointments,
      revenue: data.revenue
    }));

    setBarberData(data.sort((a, b) => b.appointments - a.appointments));
  };

  const processDailyData = (appointments: any[]) => {
    const dailyMap = new Map<string, { appointments: number; revenue: number }>();

    appointments.forEach(appointment => {
      const date = appointment.appointment_date;
      const price = appointment.services?.price || 0;

      if (dailyMap.has(date)) {
        const current = dailyMap.get(date)!;
        dailyMap.set(date, {
          appointments: current.appointments + 1,
          revenue: current.revenue + price
        });
      } else {
        dailyMap.set(date, { appointments: 1, revenue: price });
      }
    });

    const data = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('pt-BR'),
        appointments: data.appointments,
        revenue: data.revenue
      }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - 
                     new Date(b.date.split('/').reverse().join('-')).getTime());

    setDailyData(data);
  };

  const processMonthlyStats = (appointments: any[]) => {
    const totalAppointments = appointments.length;
    const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.services?.price || 0), 0);
    const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

    // Serviço mais popular
    const serviceCounts = new Map();
    appointments.forEach(apt => {
      if (apt.services) {
        const name = apt.services.name;
        serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
      }
    });
    const topService = Array.from(serviceCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Barbeiro mais produtivo
    const barberCounts = new Map();
    appointments.forEach(apt => {
      if (apt.barbers) {
        const name = apt.barbers.name;
        barberCounts.set(name, (barberCounts.get(name) || 0) + 1);
      }
    });
    const topBarber = Array.from(barberCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    setMonthlyStats({
      totalAppointments,
      totalRevenue,
      averageTicket,
      topService,
      topBarber
    });
  };

  const exportToCSV = () => {
    const csvData = dailyData.map(row => 
      `${row.date},${row.appointments},${row.revenue.toFixed(2)}`
    ).join('\n');
    
    const header = 'Data,Agendamentos,Receita\n';
    const blob = new Blob([header + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${period}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando relatórios...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com filtros */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios
            </CardTitle>
            <div className="flex gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Mês Atual</SelectItem>
                  <SelectItem value="last-month">Mês Anterior</SelectItem>
                  <SelectItem value="last-7-days">Últimos 7 dias</SelectItem>
                  <SelectItem value="last-30-days">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Agendamentos</p>
                <p className="text-2xl font-bold text-blue-600">{monthlyStats.totalAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {monthlyStats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-600">
                  R$ {monthlyStats.averageTicket.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Serviço Popular</p>
                <p className="text-lg font-bold text-orange-600">{monthlyStats.topService}</p>
              </div>
              <Scissors className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de serviços */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços Mais Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="service_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de barbeiros */}
        <Card>
          <CardHeader>
            <CardTitle>Performance dos Barbeiros</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barberData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="barber_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="appointments" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de receita por serviço */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ service_name, revenue }) => `${service_name}: R$ ${revenue.toFixed(2)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de agendamentos por dia */}
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="appointments" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela resumo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Top Barbeiro</h4>
              <p className="text-2xl font-bold text-blue-600">{monthlyStats.topBarber}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Serviço Mais Solicitado</h4>
              <p className="text-2xl font-bold text-green-600">{monthlyStats.topService}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
