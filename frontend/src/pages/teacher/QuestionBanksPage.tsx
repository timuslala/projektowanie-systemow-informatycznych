import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PlusCircle, HelpCircle, Loader2, ArrowLeft } from 'lucide-react';

interface QuestionBank {
    id: number;
    title: string;
}

export const QuestionBanksPage = () => {
    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuestionBanks = async () => {
            try {
                const response = await api.get('/api/question_banks/');
                setQuestionBanks(response.data);
            } catch (error) {
                console.error("Failed to fetch question banks", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuestionBanks();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto py-8 px-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Banki pytań</h1>
                    <p className="text-slate-500">Zarządzaj swoimi bankami pytań.</p>
                </div>
                <Link to="/question-banks/create">
                    <Button leftIcon={<PlusCircle className="w-4 h-4" />}>
                        Utwórz nowy bank
                    </Button>
                </Link>
            </div>

            <div className="mb-6">
                <Link to="/dashboard">
                    <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} className="text-slate-500 hover:text-indigo-600 pl-0">
                        Powrót do panelu głównego
                    </Button>
                </Link>
            </div>

            {
                questionBanks.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                        <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Nie masz jeszcze żadnych banków pytań</h3>
                        <p className="text-slate-500 mb-6">Zacznij tworzyć swój pierwszy bank pytań</p>
                        <Link to="/question-banks/create">
                            <Button variant="outline">Utwórz nowy bank pytań</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {questionBanks.map((bank) => (
                            <Card key={bank.id} className="group hover:border-indigo-300 transition-all duration-300">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                            <HelpCircle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {bank.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                ID: {bank.id}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )
            }
        </div >
    );
};
