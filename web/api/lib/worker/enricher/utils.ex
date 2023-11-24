defmodule Api.Worker.Enricher.Utils do

  def get_field_definition(category_definition_groups, field_name) do
    group = Enum.find(category_definition_groups, &get_field_definition_from_group(&1, field_name))
    get_field_definition_from_group(group, field_name)
  end

  def get_subfield_definition(composite_field_definition, subfield_name) do
    Enum.find(composite_field_definition.subfields, fn subfield -> subfield.name == subfield_name end)
  end

  defp get_field_definition_from_group(%{ fields: fields }, field_name) do
    Enum.find(fields, fn field -> field.name == field_name end)
  end
  defp get_field_definition_from_group(_, _), do: nil
end
